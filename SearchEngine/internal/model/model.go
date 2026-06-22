// Package model define las estructuras que viajan entre el escáner, el enriquecedor
// y la API HTTP. Son el contrato JSON que consume el panel de admin y, a través de él,
// el backend NestJS (POST /admin/catalog/import).
package model

import "time"

// Type es el tipo de audiovisual, alineado con los tipos del backend
// ('movie' | 'series' | 'telenovela' | 'show' | 'anime').
type Type string

const (
	TypeMovie      Type = "movie"
	TypeSeries     Type = "series"
	TypeAnime      Type = "anime"
	TypeTelenovela Type = "telenovela"
	TypeShow       Type = "show"
)

// Episode es un capítulo físico dentro de una temporada.
type Episode struct {
	Number      int     `json:"number"`
	SizeGb      float64 `json:"sizeGb"`
	DurationMin *int    `json:"durationMin,omitempty"`
	// Path relativo al root del escaneo; útil para diagnóstico desde el panel.
	Path string `json:"path,omitempty"`
}

// Season agrupa los capítulos de una temporada.
type Season struct {
	Number   int       `json:"number"`
	SizeGb   float64   `json:"sizeGb"`
	Episodes []Episode `json:"episodes"`
}

// Item es una película o una serie con sus metadatos extraídos del nombre y
// (opcionalmente) enriquecidos vía TMDb.
type Item struct {
	// Code es el código físico inmutable del inventario (P1, S2, A3...). Clave de dedup.
	Code string `json:"code"`
	Type Type   `json:"type"`
	// Title: nombre en español (el que se muestra en el catálogo, va entre paréntesis
	// en el nombre del archivo según la convención).
	Title string `json:"title"`
	// TitleEn: nombre original/inglés (fuera del paréntesis); se usa para consultar TMDb.
	TitleEn string `json:"titleEn"`
	Year    int    `json:"year"`

	// SizeGb: peso del archivo (películas) o suma de temporadas (episódicos).
	SizeGb      float64 `json:"sizeGb"`
	IsPremiere  bool    `json:"isPremiere"`
	DurationMin *int    `json:"durationMin,omitempty"`

	// Enriquecimiento TMDb (vacíos si no hay API key o sin coincidencia).
	Rating      float64 `json:"rating"`
	Description string  `json:"description"`
	PosterURL   string  `json:"posterUrl"`
	Genre       string  `json:"genre"`
	Enriched    bool    `json:"enriched"`

	// Solo episódicos.
	Seasons []Season `json:"seasons,omitempty"`

	// Path relativo del archivo (película) o carpeta (serie) respecto al root.
	Path string `json:"path"`
}

// ScanResult es la respuesta de /scan y /rescan.
type ScanResult struct {
	Root      string    `json:"root"`
	Items     []Item    `json:"items"`
	Stats     Stats     `json:"stats"`
	Warnings  []string  `json:"warnings,omitempty"`
	Enriched  bool      `json:"enriched"`
	ScannedAt time.Time `json:"scannedAt"`
	// FromCache indica si el resultado viene de la caché (escaneo previo) o es fresco.
	FromCache bool `json:"fromCache"`
}

// Stats resume el inventario físico encontrado.
type Stats struct {
	Total       int     `json:"total"`
	Movies      int     `json:"movies"`
	Series      int     `json:"series"`
	Episodes    int     `json:"episodes"`
	TotalSizeGb float64 `json:"totalSizeGb"`
}

// Health es la respuesta de /health, usada por el panel para detectar el servidor.
type Health struct {
	Status     string     `json:"status"`
	Service    string     `json:"service"`
	Version    string     `json:"version"`
	Root       string     `json:"root"`
	EnrichOn   bool       `json:"enrichEnabled"`
	LastScanAt *time.Time `json:"lastScanAt,omitempty"`
}
