// Package scanner recorre recursivamente el sistema de archivos desde un directorio
// raíz y reconstruye el inventario (películas y series con sus temporadas/capítulos)
// a partir de los nombres de archivos y carpetas.
package scanner

import (
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"dahem/searchengine/internal/model"
)

// videoExts: extensiones consideradas "vídeo" al detectar películas y capítulos.
var videoExts = map[string]bool{
	".mp4": true, ".mkv": true, ".avi": true, ".ts": true, ".mov": true,
	".wmv": true, ".m4v": true, ".webm": true, ".flv": true, ".mpg": true,
	".mpeg": true, ".m2ts": true,
}

const bytesPerGb = 1024 * 1024 * 1024

// Scan recorre `root` y devuelve los ítems encontrados (sin enriquecer) más estadísticas.
// Las películas/animes-película son archivos sueltos; las series son carpetas raíz con
// subcarpetas de temporada y archivos de capítulo.
func Scan(root string) (model.ScanResult, error) {
	result := model.ScanResult{Root: root}

	// series indexadas por código (S1, A2...) para agregar temporadas y capítulos.
	series := map[string]*model.Item{}
	// seasons[seriesCode][seasonNumber] -> *Season para acumular capítulos.
	seasons := map[string]map[int]*model.Season{}

	ensureSeries := func(code string) *model.Item {
		if it, ok := series[code]; ok {
			return it
		}
		it := &model.Item{Code: code, Type: typeFromCode(code)}
		series[code] = it
		seasons[code] = map[int]*model.Season{}
		return it
	}
	ensureSeason := func(seriesCode string, number int) *model.Season {
		if seasons[seriesCode] == nil {
			seasons[seriesCode] = map[int]*model.Season{}
		}
		s, ok := seasons[seriesCode][number]
		if !ok {
			s = &model.Season{Number: number}
			seasons[seriesCode][number] = s
		}
		return s
	}

	currentYear := time.Now().Year()

	walkErr := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			result.Warnings = append(result.Warnings, "No se pudo leer "+path+": "+err.Error())
			return nil // continúa con el resto del árbol
		}
		if path == root {
			return nil
		}
		base := d.Name()
		rel, _ := filepath.Rel(root, path)

		if d.IsDir() {
			// Carpeta raíz de serie (CODE_titulo_(alt)_[año]).
			if pr, ok := parseRoot(base); ok {
				it := ensureSeries(pr.Code)
				it.Title = pr.Title
				it.TitleEn = pr.TitleEn
				it.Year = pr.Year
				it.Type = pr.Type
				it.IsPremiere = pr.Year >= currentYear
				it.Path = rel
				return nil
			}
			// Carpeta de temporada (CODE-SEASON_..._(Temporada N)).
			if ps, ok := parseSeason(base); ok {
				sc := seriesCodeOf(ps.Code)
				ensureSeries(sc)
				ensureSeason(sc, ps.Number)
			}
			return nil
		}

		// Archivos: solo vídeos.
		ext := strings.ToLower(filepath.Ext(base))
		if !videoExts[ext] {
			return nil
		}
		nameNoExt := strings.TrimSpace(strings.TrimSuffix(base, filepath.Ext(base)))

		// Capítulo de serie.
		if pe, ok := parseEpisode(nameNoExt); ok {
			sc := seriesCodeOf(pe.Code)
			ensureSeries(sc)
			season := ensureSeason(sc, pe.Season)
			season.Episodes = append(season.Episodes, model.Episode{
				Number: pe.Episode,
				SizeGb: fileSizeGb(path),
				Path:   rel,
			})
			return nil
		}

		// Película / anime-película: archivo suelto con nombre de ítem raíz.
		if pr, ok := parseRoot(nameNoExt); ok {
			result.Items = append(result.Items, model.Item{
				Code:       pr.Code,
				Type:       pr.Type,
				Title:      pr.Title,
				TitleEn:    pr.TitleEn,
				Year:       pr.Year,
				SizeGb:     fileSizeGb(path),
				IsPremiere: pr.Year >= currentYear,
				Path:       rel,
			})
			return nil
		}

		result.Warnings = append(result.Warnings, "Nombre no reconocido: "+rel)
		return nil
	})
	if walkErr != nil {
		return result, walkErr
	}

	// Materializa las series: ordena temporadas/capítulos y calcula tamaños.
	for code, it := range series {
		var seasonList []model.Season
		var total float64
		for _, s := range seasons[code] {
			sort.Slice(s.Episodes, func(i, j int) bool { return s.Episodes[i].Number < s.Episodes[j].Number })
			var ssize float64
			for _, ep := range s.Episodes {
				ssize += ep.SizeGb
			}
			s.SizeGb = round2(ssize)
			total += ssize
			seasonList = append(seasonList, *s)
		}
		sort.Slice(seasonList, func(i, j int) bool { return seasonList[i].Number < seasonList[j].Number })
		it.Seasons = seasonList
		it.SizeGb = round2(total)
		result.Items = append(result.Items, *it)
	}

	// Orden estable por código para una salida predecible.
	sort.Slice(result.Items, func(i, j int) bool { return result.Items[i].Code < result.Items[j].Code })

	result.Stats = computeStats(result.Items)
	return result, nil
}

func fileSizeGb(path string) float64 {
	info, err := os.Stat(path)
	if err != nil {
		return 0
	}
	return round2(float64(info.Size()) / bytesPerGb)
}

func round2(v float64) float64 {
	return float64(int64(v*100+0.5)) / 100
}

func computeStats(items []model.Item) model.Stats {
	st := model.Stats{Total: len(items)}
	for _, it := range items {
		st.TotalSizeGb += it.SizeGb
		if it.Type == model.TypeMovie {
			st.Movies++
		} else {
			st.Series++
			for _, s := range it.Seasons {
				st.Episodes += len(s.Episodes)
			}
		}
	}
	st.TotalSizeGb = round2(st.TotalSizeGb)
	return st
}
