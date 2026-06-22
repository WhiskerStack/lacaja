// Package enrich completa los ítems con metadatos de una API externa gratuita (TMDb):
// sinopsis, póster, valoración y género. Si no hay API key configurada, los ítems se
// devuelven tal cual (Enriched=false) sin provocar error.
package enrich

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"sync"
	"time"

	"dahem/searchengine/internal/model"
)

const (
	tmdbBase     = "https://api.themoviedb.org/3"
	tmdbImageW   = "https://image.tmdb.org/t/p/w500"
	httpTimeout  = 12 * time.Second
	maxParallel  = 6
)

// Enricher consulta TMDb. Es seguro para uso concurrente.
type Enricher struct {
	apiKey   string
	language string
	client   *http.Client

	genresOnce sync.Once
	movieGen   map[int]string
	tvGen      map[int]string
}

// New crea un enriquecedor. Si apiKey está vacío, Enabled() devuelve false.
func New(apiKey, language string) *Enricher {
	if language == "" {
		language = "es-ES"
	}
	return &Enricher{
		apiKey:   apiKey,
		language: language,
		client:   &http.Client{Timeout: httpTimeout},
	}
}

func (e *Enricher) Enabled() bool { return e.apiKey != "" }

// EnrichAll completa en paralelo (acotado) todos los ítems. No falla aunque TMDb
// devuelva errores puntuales: registra y sigue.
func (e *Enricher) EnrichAll(ctx context.Context, items []model.Item) {
	if !e.Enabled() {
		return
	}
	e.loadGenres(ctx)

	sem := make(chan struct{}, maxParallel)
	var wg sync.WaitGroup
	for i := range items {
		wg.Add(1)
		sem <- struct{}{}
		go func(idx int) {
			defer wg.Done()
			defer func() { <-sem }()
			e.enrichOne(ctx, &items[idx])
		}(i)
	}
	wg.Wait()
}

func (e *Enricher) enrichOne(ctx context.Context, it *model.Item) {
	query := it.TitleEn
	if query == "" {
		query = it.Title
	}

	isMovie := it.Type == model.TypeMovie
	hit, ok := e.search(ctx, query, it.Year, isMovie)
	// Reintenta con el título en español si el original no devolvió nada.
	if !ok && it.Title != "" && it.Title != query {
		hit, ok = e.search(ctx, it.Title, it.Year, isMovie)
	}
	if !ok {
		return
	}

	it.Description = hit.Overview
	it.Rating = round1(hit.VoteAverage)
	if hit.PosterPath != "" {
		it.PosterURL = tmdbImageW + hit.PosterPath
	}
	if g := e.firstGenre(hit.GenreIDs, isMovie); g != "" {
		it.Genre = g
	}
	it.Enriched = true
}

type searchHit struct {
	Overview    string  `json:"overview"`
	PosterPath  string  `json:"poster_path"`
	VoteAverage float64 `json:"vote_average"`
	GenreIDs    []int   `json:"genre_ids"`
}

type searchResponse struct {
	Results []searchHit `json:"results"`
}

func (e *Enricher) search(ctx context.Context, query string, year int, isMovie bool) (searchHit, bool) {
	endpoint := "/search/tv"
	q := url.Values{}
	q.Set("query", query)
	if year > 0 {
		if isMovie {
			endpoint = "/search/movie"
			q.Set("year", strconv.Itoa(year))
		} else {
			q.Set("first_air_date_year", strconv.Itoa(year))
		}
	} else if isMovie {
		endpoint = "/search/movie"
	}

	var resp searchResponse
	if err := e.get(ctx, endpoint, q, &resp); err != nil || len(resp.Results) == 0 {
		return searchHit{}, false
	}
	return resp.Results[0], true
}

// loadGenres descarga (una vez) el diccionario id->nombre de géneros en el idioma
// configurado, para traducir los genre_ids de cada resultado.
func (e *Enricher) loadGenres(ctx context.Context) {
	e.genresOnce.Do(func() {
		e.movieGen = e.fetchGenres(ctx, "/genre/movie/list")
		e.tvGen = e.fetchGenres(ctx, "/genre/tv/list")
	})
}

func (e *Enricher) fetchGenres(ctx context.Context, endpoint string) map[int]string {
	var resp struct {
		Genres []struct {
			ID   int    `json:"id"`
			Name string `json:"name"`
		} `json:"genres"`
	}
	out := map[int]string{}
	if err := e.get(ctx, endpoint, url.Values{}, &resp); err != nil {
		return out
	}
	for _, g := range resp.Genres {
		out[g.ID] = g.Name
	}
	return out
}

func (e *Enricher) firstGenre(ids []int, isMovie bool) string {
	table := e.tvGen
	if isMovie {
		table = e.movieGen
	}
	for _, id := range ids {
		if name, ok := table[id]; ok {
			return name
		}
	}
	return ""
}

// get hace la petición GET a TMDb añadiendo api_key e idioma, y decodifica el JSON.
func (e *Enricher) get(ctx context.Context, endpoint string, q url.Values, out any) error {
	q.Set("api_key", e.apiKey)
	q.Set("language", e.language)
	full := tmdbBase + endpoint + "?" + q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, full, nil)
	if err != nil {
		return err
	}
	resp, err := e.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("tmdb %s: status %d", endpoint, resp.StatusCode)
	}
	return json.NewDecoder(resp.Body).Decode(out)
}

func round1(v float64) float64 {
	return float64(int64(v*10+0.5)) / 10
}
