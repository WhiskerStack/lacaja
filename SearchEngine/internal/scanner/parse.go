package scanner

import (
	"regexp"
	"strconv"
	"strings"

	"dahem/searchengine/internal/model"
)

// Convención de nombres del inventario físico (ver ejemplos en SearchEngine/examples):
//
//	Película (archivo):   P1_57 Seconds_(57 segundos)_[2023].mp4
//	Serie (carpeta raíz): S1_Se tiene que morir mucha gente_(Many People Need To Die)_[2026]
//	Temporada (carpeta):  S1-1_Se tiene que morir mucha gente_(Temporada 1)
//	Capítulo (archivo):   S1-1-1_Se tiene que morir mucha gente S1-E1.ts
//
// El código lleva la letra del tipo: P=película, S=serie, A=anime, N=novela, H=show.

var (
	// Ítem raíz: CODE_titulo_(titulo alterno)_[año]. CODE sin guiones (P1, S1, A3...).
	rootRe = regexp.MustCompile(`^([PSANH]\d+)_(.+?)_\((.+?)\)_\[(\d{4})\]$`)

	// Carpeta de temporada: CODE-SEASON_titulo_(Temporada N).
	seasonRe = regexp.MustCompile(`^([PSANH]\d+-\d+)_(.+?)_\(\s*Temporada\s+(\d+)\s*\)$`)

	// Archivo de capítulo: CODE-SEASON-EP_titulo SX-EY.
	episodeRe = regexp.MustCompile(`^([PSANH]\d+-\d+-\d+)_(.+?)\s+S(\d+)-E(\d+)$`)
)

// typeFromCode mapea la letra inicial del código al tipo del backend.
func typeFromCode(code string) model.Type {
	if code == "" {
		return model.TypeMovie
	}
	switch code[0] {
	case 'P':
		return model.TypeMovie
	case 'S':
		return model.TypeSeries
	case 'A':
		return model.TypeAnime
	case 'N':
		return model.TypeTelenovela
	case 'H':
		return model.TypeShow
	default:
		return model.TypeMovie
	}
}

// seriesCodeOf devuelve el código de la serie a partir de un código de temporada o
// capítulo (S1-1 -> S1, S1-1-2 -> S1).
func seriesCodeOf(code string) string {
	if i := strings.IndexByte(code, '-'); i >= 0 {
		return code[:i]
	}
	return code
}

// parsedRoot es el resultado de parsear el nombre de un ítem raíz.
type parsedRoot struct {
	Code    string
	Title   string // español (paréntesis)
	TitleEn string // original/inglés (fuera del paréntesis)
	Year    int
	Type    model.Type
}

func parseRoot(name string) (parsedRoot, bool) {
	m := rootRe.FindStringSubmatch(strings.TrimSpace(name))
	if m == nil {
		return parsedRoot{}, false
	}
	year, _ := strconv.Atoi(m[4])
	return parsedRoot{
		Code:    m[1],
		TitleEn: strings.TrimSpace(m[2]),
		Title:   strings.TrimSpace(m[3]),
		Year:    year,
		Type:    typeFromCode(m[1]),
	}, true
}

type parsedSeason struct {
	Code   string // S1-1
	Number int
}

func parseSeason(name string) (parsedSeason, bool) {
	m := seasonRe.FindStringSubmatch(strings.TrimSpace(name))
	if m == nil {
		return parsedSeason{}, false
	}
	num, _ := strconv.Atoi(m[3])
	return parsedSeason{Code: m[1], Number: num}, true
}

type parsedEpisode struct {
	Code    string // S1-1-2
	Season  int
	Episode int
}

func parseEpisode(name string) (parsedEpisode, bool) {
	m := episodeRe.FindStringSubmatch(strings.TrimSpace(name))
	if m == nil {
		return parsedEpisode{}, false
	}
	season, _ := strconv.Atoi(m[3])
	ep, _ := strconv.Atoi(m[4])
	return parsedEpisode{Code: m[1], Season: season, Episode: ep}, true
}
