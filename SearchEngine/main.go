// Comando dahem-search-engine: servidor local que inventaría las películas/series
// físicas y las convierte en datos listos para cargar a la base de datos vía el panel
// de admin. Por defecto escanea desde la carpeta donde está el ejecutable.
//
//	Uso:
//	  searchengine            arranca el servidor (puerto 4111 por defecto)
//	  searchengine -scan      imprime el resultado del escaneo por stdout y termina
package main

import (
	"context"
	"encoding/json"
	"flag"
	"log"
	"os"
	"path/filepath"
	"strings"

	"dahem/searchengine/internal/enrich"
	"dahem/searchengine/internal/scanner"
	"dahem/searchengine/internal/server"
)

func main() {
	scanOnce := flag.Bool("scan", false, "escanea, imprime el JSON por stdout y termina (sin levantar el servidor)")
	flag.Parse()

	execDir := executableDir()
	cfg := server.Load(execDir)

	if *scanOnce {
		runScanOnce(cfg)
		return
	}

	srv := server.New(cfg)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("SearchEngine se detuvo: %v", err)
	}
}

// executableDir devuelve la carpeta del binario (la "ubicación actual del archivo").
// En modo dev (`go run .`) el binario se compila a un temporal (…/go-build…/), así que
// en ese caso se usa el directorio de trabajo (donde está main.go). Respaldo al cwd si
// no se puede resolver el ejecutable.
func executableDir() string {
	exe, err := os.Executable()
	if err == nil {
		dir := filepath.Dir(exe)
		if !isGoRunTempDir(dir) {
			return dir
		}
	}
	if wd, werr := os.Getwd(); werr == nil {
		return wd
	}
	return "."
}

// isGoRunTempDir detecta el directorio temporal que usa `go run` para compilar.
func isGoRunTempDir(dir string) bool {
	return strings.Contains(filepath.ToSlash(dir), "go-build")
}

func runScanOnce(cfg server.Config) {
	res, err := scanner.Scan(cfg.Root)
	if err != nil {
		log.Fatalf("Error al escanear: %v", err)
	}
	e := enrich.New(cfg.TMDBApiKey, cfg.Language)
	e.EnrichAll(context.Background(), res.Items)
	res.Enriched = e.Enabled()

	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	_ = enc.Encode(res)
}
