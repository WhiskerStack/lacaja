// Package server expone la API HTTP local (puerto 4111 por defecto) que consume el
// panel de admin: /health para detectar disponibilidad, /scan para escanear+enriquecer
// (sirve de caché), /rescan para forzar un escaneo nuevo del disco y /inventory para
// estadísticas rápidas del inventario físico.
package server

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"sync"
	"time"

	"dahem/searchengine/internal/enrich"
	"dahem/searchengine/internal/model"
	"dahem/searchengine/internal/scanner"
)

const version = "1.0.0"

type Server struct {
	cfg      Config
	enricher *enrich.Enricher

	// Caché del último escaneo (se calienta al arrancar y se refresca con /rescan).
	mu     sync.RWMutex
	cached *model.ScanResult
	scanMu sync.Mutex // serializa escaneos concurrentes (arranque + /rescan)
}

func New(cfg Config) *Server {
	return &Server{
		cfg:      cfg,
		enricher: enrich.New(cfg.TMDBApiKey, cfg.Language),
	}
}

// Handler arma el router con CORS aplicado a todas las rutas.
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", s.handleHealth)
	mux.HandleFunc("/scan", s.handleScan)
	mux.HandleFunc("/rescan", s.handleRescan)
	mux.HandleFunc("/inventory", s.handleInventory)
	return s.withCORS(mux)
}

// ListenAndServe levanta el servidor HTTP y lanza un escaneo inicial en segundo plano
// (igual que al arrancar la app: deja el inventario cargado en caché).
func (s *Server) ListenAndServe() error {
	addr := ":" + strconv.Itoa(s.cfg.Port)
	srv := &http.Server{
		Addr:              addr,
		Handler:           s.Handler(),
		ReadHeaderTimeout: 10 * time.Second,
	}
	go s.warmUp()
	log.Printf("SearchEngine escuchando en http://localhost%s (root=%s, tmdb=%v)", addr, s.cfg.Root, s.enricher.Enabled())
	return srv.ListenAndServe()
}

// warmUp hace el escaneo inicial al arrancar y lo deja en caché.
func (s *Server) warmUp() {
	log.Printf("Escaneo inicial del inventario en %s…", s.cfg.Root)
	res, err := s.runScan(context.Background())
	if err != nil {
		log.Printf("El escaneo inicial falló: %v", err)
		return
	}
	log.Printf("Inventario cargado: %d títulos (%d películas, %d series, %d capítulos), %.2f GB",
		res.Stats.Total, res.Stats.Movies, res.Stats.Series, res.Stats.Episodes, res.Stats.TotalSizeGb)
}

// runScan escanea el disco, enriquece vía TMDb y guarda el resultado en caché. Está
// serializado: dos llamadas concurrentes no lanzan dos escaneos a la vez.
func (s *Server) runScan(ctx context.Context) (model.ScanResult, error) {
	s.scanMu.Lock()
	defer s.scanMu.Unlock()

	res, err := scanner.Scan(s.cfg.Root)
	if err != nil {
		return res, err
	}

	enrichCtx, cancel := context.WithTimeout(ctx, 5*time.Minute)
	defer cancel()
	s.enricher.EnrichAll(enrichCtx, res.Items)
	res.Enriched = s.enricher.Enabled()
	res.ScannedAt = time.Now()

	s.mu.Lock()
	cp := res
	s.cached = &cp
	s.mu.Unlock()
	return res, nil
}

// cachedResult devuelve el último escaneo en caché, si lo hay.
func (s *Server) cachedResult() (model.ScanResult, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.cached == nil {
		return model.ScanResult{}, false
	}
	return *s.cached, true
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	h := model.Health{
		Status:   "ok",
		Service:  "dahem-search-engine",
		Version:  version,
		Root:     s.cfg.Root,
		EnrichOn: s.enricher.Enabled(),
	}
	if cached, ok := s.cachedResult(); ok {
		at := cached.ScannedAt
		h.LastScanAt = &at
	}
	writeJSON(w, http.StatusOK, h)
}

// handleInventory escanea sin enriquecer: rápido, solo estructura y tamaños. Siempre
// lee el disco en el momento (no usa la caché enriquecida).
func (s *Server) handleInventory(w http.ResponseWriter, _ *http.Request) {
	res, err := scanner.Scan(s.cfg.Root)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, res)
}

// handleScan devuelve el inventario enriquecido desde la caché (instantáneo). Si aún
// no hay caché (p. ej. el escaneo inicial no terminó), lo calcula en el momento.
func (s *Server) handleScan(w http.ResponseWriter, r *http.Request) {
	if cached, ok := s.cachedResult(); ok {
		cached.FromCache = true
		writeJSON(w, http.StatusOK, cached)
		return
	}
	res, err := s.runScan(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, res)
}

// handleRescan fuerza un escaneo NUEVO del disco (refresca la caché), igual que el
// escaneo del arranque. Útil tras añadir o quitar películas sin reiniciar el servidor.
func (s *Server) handleRescan(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "usa POST o GET")
		return
	}
	res, err := s.runScan(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	log.Printf("Re-escaneo manual: %d títulos, %.2f GB", res.Stats.Total, res.Stats.TotalSizeGb)
	writeJSON(w, http.StatusOK, res)
}

// withCORS permite las peticiones del panel de admin (origen configurable) y responde
// a los preflight OPTIONS.
func (s *Server) withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if s.originAllowed(origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) originAllowed(origin string) bool {
	if origin == "" {
		return false
	}
	for _, o := range s.cfg.AllowedOrigins {
		if o == origin || o == "*" {
			return true
		}
	}
	return false
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
