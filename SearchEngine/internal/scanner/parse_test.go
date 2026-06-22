package scanner

import (
	"testing"

	"dahem/searchengine/internal/model"
)

func TestParseRootMovie(t *testing.T) {
	pr, ok := parseRoot("P1_57 Seconds_(57 segundos)_[2023]")
	if !ok {
		t.Fatal("no parseó la película")
	}
	if pr.Code != "P1" || pr.TitleEn != "57 Seconds" || pr.Title != "57 segundos" || pr.Year != 2023 {
		t.Fatalf("campos inesperados: %+v", pr)
	}
	if pr.Type != model.TypeMovie {
		t.Fatalf("tipo esperado movie, got %s", pr.Type)
	}
}

func TestParseRootSeries(t *testing.T) {
	pr, ok := parseRoot("S2_Moon Knight_(Caballero Luna)_[2022]")
	if !ok {
		t.Fatal("no parseó la serie")
	}
	if pr.Code != "S2" || pr.TitleEn != "Moon Knight" || pr.Title != "Caballero Luna" || pr.Type != model.TypeSeries {
		t.Fatalf("campos inesperados: %+v", pr)
	}
}

func TestParseSeason(t *testing.T) {
	ps, ok := parseSeason("S1-1_Se tiene que morir mucha gente_(Temporada 1)")
	if !ok || ps.Code != "S1-1" || ps.Number != 1 {
		t.Fatalf("temporada inesperada: %+v ok=%v", ps, ok)
	}
}

func TestParseEpisode(t *testing.T) {
	pe, ok := parseEpisode("S1-1-3_Se tiene que morir mucha gente S1-E3")
	if !ok || pe.Code != "S1-1-3" || pe.Season != 1 || pe.Episode != 3 {
		t.Fatalf("capítulo inesperado: %+v ok=%v", pe, ok)
	}
}

func TestSeriesCodeOf(t *testing.T) {
	cases := map[string]string{"S1": "S1", "S1-2": "S1", "S1-2-3": "S1", "A10-1-5": "A10"}
	for in, want := range cases {
		if got := seriesCodeOf(in); got != want {
			t.Errorf("seriesCodeOf(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestTypeFromCode(t *testing.T) {
	cases := map[string]model.Type{
		"P1": model.TypeMovie, "S1": model.TypeSeries, "A1": model.TypeAnime,
		"N1": model.TypeTelenovela, "H1": model.TypeShow,
	}
	for code, want := range cases {
		if got := typeFromCode(code); got != want {
			t.Errorf("typeFromCode(%q) = %q, want %q", code, got, want)
		}
	}
}
