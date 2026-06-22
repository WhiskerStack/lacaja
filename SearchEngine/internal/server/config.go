package server

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strconv"
)

// Config del servidor. Se resuelve en este orden de prioridad:
//  1. Variables de entorno (SEARCHENGINE_*).
//  2. Fichero searchengine.config.json junto al ejecutable.
//  3. Valores por defecto.
type Config struct {
	Port           int      `json:"port"`
	Root           string   `json:"root"`
	TMDBApiKey     string   `json:"tmdbApiKey"`
	Language       string   `json:"language"`
	AllowedOrigins []string `json:"allowedOrigins"`
}

func defaults(execDir string) Config {
	return Config{
		Port:     4111,
		Root:     execDir, // por defecto escanea desde donde está el binario
		Language: "es-ES",
		AllowedOrigins: []string{
			"http://localhost:5173",
			"http://localhost:5174",
		},
	}
}

// Load resuelve la configuración. execDir es la carpeta del ejecutable.
func Load(execDir string) Config {
	cfg := defaults(execDir)

	// 2) Fichero JSON junto al binario.
	if data, err := os.ReadFile(filepath.Join(execDir, "searchengine.config.json")); err == nil {
		var fileCfg Config
		if json.Unmarshal(data, &fileCfg) == nil {
			if fileCfg.Port != 0 {
				cfg.Port = fileCfg.Port
			}
			if fileCfg.Root != "" {
				cfg.Root = fileCfg.Root
			}
			if fileCfg.TMDBApiKey != "" {
				cfg.TMDBApiKey = fileCfg.TMDBApiKey
			}
			if fileCfg.Language != "" {
				cfg.Language = fileCfg.Language
			}
			if len(fileCfg.AllowedOrigins) > 0 {
				cfg.AllowedOrigins = fileCfg.AllowedOrigins
			}
		}
	}

	// 1) Variables de entorno (máxima prioridad).
	if v := os.Getenv("SEARCHENGINE_PORT"); v != "" {
		if p, err := strconv.Atoi(v); err == nil {
			cfg.Port = p
		}
	}
	if v := os.Getenv("SEARCHENGINE_ROOT"); v != "" {
		cfg.Root = v
	}
	if v := os.Getenv("TMDB_API_KEY"); v != "" {
		cfg.TMDBApiKey = v
	}
	if v := os.Getenv("SEARCHENGINE_LANGUAGE"); v != "" {
		cfg.Language = v
	}

	if abs, err := filepath.Abs(cfg.Root); err == nil {
		cfg.Root = abs
	}
	return cfg
}
