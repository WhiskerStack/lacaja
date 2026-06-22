# Dahem SearchEngine

Servidor **local** (Go) que lleva el inventario físico de las películas y series, y las
convierte en datos listos para cargar a la base de datos del catálogo Dahem.

Está pensado para vivir **dentro de la carpeta donde están todas las películas**: al
arrancar, escanea recursivamente desde su propia ubicación, extrae los metadatos de los
nombres de los archivos, los enriquece con [TMDb](https://www.themoviedb.org/) y los
expone por HTTP (puerto **4111** por defecto). El **panel de admin** detecta ese puerto
y, si responde, habilita la sección **Inventario** para escanear y cargar a BD.

```
┌────────────────┐   /scan    ┌──────────────────┐  /admin/catalog/import  ┌──────────┐
│  Panel Admin   │ ─────────► │  SearchEngine    │                          │ Backend  │
│  (navegador)   │ ◄───────── │  (Go, :4111)     │                          │ NestJS   │
│                │  inventario│  escanea+TMDb    │                          │  + BD    │
│                │ ───────────────────────────────────────────────────────► │ (dedup   │
│                │            └──────────────────┘     items enriquecidos    │  por code)│
└────────────────┘                                                          └──────────┘
```

El navegador del admin corre en la misma máquina que el SearchEngine, por eso puede
llamar a `localhost:4111` directamente. El SearchEngine **no** toca la base de datos ni
necesita credenciales: solo lee el disco y consulta TMDb.

---

## Convención de nombres del inventario

El escáner reconoce esta estructura (ver `examples/`). La **letra del código** marca el
tipo: `P`=película, `S`=serie, `A`=anime, `N`=novela, `H`=show.

```
PELICULAS (Px)/
  P1_57 Seconds_(57 segundos)_[2023].mp4
            │          │           └── año
            │          └── nombre en español (se muestra en el catálogo)
            └── nombre original / inglés (se usa para consultar TMDb)

SERIES (Sx)/
  S2_Moon Knight_(Caballero Luna)_[2022]/         ← carpeta de la serie
    S2-1_Moon Knight_(Temporada 1)/               ← carpeta de temporada (S{serie}-{temporada})
      S2-1-1_Moon Knight S1-E1.ts                 ← capítulo (S{serie}-{temporada}-{capítulo})
```

- **Película / anime-película**: archivo suelto `CODE_Inglés_(Español)_[Año].ext`.
- **Serie / anime / novela / show**: carpeta raíz `CODE_Inglés_(Español)_[Año]`, con
  subcarpetas de temporada y archivos de capítulo dentro.
- El **peso** de cada archivo se mide del disco (GB). En series, el peso de la temporada
  es la suma de sus capítulos.
- Se marca `isPremiere` cuando el año es el actual o posterior.

Extensiones de vídeo reconocidas: `.mp4 .mkv .avi .ts .mov .wmv .m4v .webm .flv .mpg .mpeg .m2ts`.

---

## Requisitos

- [Go 1.22+](https://go.dev/dl/) para compilar (no hace falta en la máquina final: el
  binario es autónomo, sin dependencias externas).
- (Opcional) una **API key gratuita de TMDb** para el enriquecimiento:
  crea una cuenta en <https://www.themoviedb.org/settings/api> y copia la *API Key (v3 auth)*.
  Sin key, el inventario se escanea igual pero sin sinopsis, póster, valoración ni género.

---

## Compilar

Desde esta carpeta (`SearchEngine/`):

```bash
# Windows (PowerShell o cmd)
go build -o searchengine.exe .

# Compilación pequeña (sin tabla de símbolos / debug):
go build -ldflags "-s -w" -o searchengine.exe .
```

Esto genera `searchengine.exe`, un único archivo que puedes **copiar a la carpeta raíz de
las películas**.

> Compilación cruzada (generar el .exe desde otro SO):
> ```bash
> GOOS=windows GOARCH=amd64 go build -o searchengine.exe .
> ```

Verificar con los ejemplos incluidos (no carga nada, solo imprime lo que detecta):

```bash
go run . -scan
```

---

## Configurar

La configuración se resuelve en este orden (lo de arriba gana):

1. **Variables de entorno**: `SEARCHENGINE_PORT`, `SEARCHENGINE_ROOT`, `TMDB_API_KEY`, `SEARCHENGINE_LANGUAGE`.
2. **Fichero `searchengine.config.json`** junto al ejecutable (copia `searchengine.config.example.json`).
3. **Valores por defecto**: puerto `4111`, raíz = carpeta del ejecutable, idioma `es-ES`.

Ejemplo de `searchengine.config.json`:

```json
{
  "port": 4111,
  "root": ".",
  "tmdbApiKey": "tu_api_key_de_tmdb",
  "language": "es-ES",
  "allowedOrigins": ["http://localhost:5173", "http://localhost:5174"]
}
```

- `root`: déjalo en `"."` para escanear desde donde está el ejecutable (lo normal).
- `allowedOrigins`: orígenes del panel de admin permitidos por CORS. Ajusta el puerto al
  de tu panel (Vite usa `5173`/`5174` en desarrollo).

---

## Ejecutar

Copia `searchengine.exe` (y opcionalmente `searchengine.config.json`) a la carpeta raíz
de las películas y ejecútalo:

```bash
searchengine.exe
# → SearchEngine escuchando en http://localhost:4111 (root=..., tmdb=true)
```

Al **arrancar**, el servidor hace un escaneo inicial en segundo plano y lo deja en
**caché** (verás en el log `Inventario cargado: N títulos…`). Así `/scan` responde al
instante. Cuando añadas o quites películas, usa `/rescan` para volver a leer el disco sin
reiniciar.

### Endpoints

| Método     | Ruta         | Descripción                                                            |
|------------|--------------|------------------------------------------------------------------------|
| GET        | `/health`    | Disponibilidad + `lastScanAt` (el panel lo usa para detectarlo).       |
| GET        | `/inventory` | Escaneo rápido **sin** enriquecer (estructura + tamaños), siempre fresco.|
| GET        | `/scan`      | Inventario **enriquecido** desde la caché (instantáneo).               |
| POST / GET | `/rescan`    | **Fuerza un escaneo nuevo** del disco y refresca la caché.             |

```bash
curl http://localhost:4111/health
curl http://localhost:4111/scan
curl -X POST http://localhost:4111/rescan   # tras agregar películas nuevas
```

---

## Auto-arranque en Windows (cada vez que inicies sesión)

Elige **una** de estas opciones.

### Opción A — Carpeta de Inicio (la más simple)

1. Pulsa `Win + R`, escribe `shell:startup` y Enter. Se abre la carpeta de Inicio.
2. Crea ahí un acceso directo a `searchengine.exe` (clic derecho sobre el .exe →
   *Enviar a* → *Escritorio*, y mueve el acceso directo a la carpeta de Inicio), **o**
   crea un `.bat` con:
   ```bat
   @echo off
   start "" "D:\ruta\a\las\peliculas\searchengine.exe"
   ```
3. Al iniciar sesión, Windows lo lanzará automáticamente.

> Para que no muestre ventana de consola, puedes usar el `.bat` anterior y marcar el
> acceso directo como *Minimizado*, o usar la Opción B (que corre en segundo plano).

### Opción B — Programador de tareas (arranca sin ventana, ideal)

En PowerShell (como administrador), ajustando la ruta:

```powershell
$exe = "D:\ruta\a\las\peliculas\searchengine.exe"
schtasks /Create /TN "DahemSearchEngine" /TR "`"$exe`"" /SC ONLOGON /RL LIMITED /F
```

- `/SC ONLOGON`: arranca al iniciar sesión.
- Para arrancar **al encender el equipo** (antes del login), usa `/SC ONSTART` y ejecútalo
  como administrador.
- Iniciar la tarea ahora mismo sin reiniciar:
  ```powershell
  schtasks /Run /TN "DahemSearchEngine"
  ```
- Quitarla:
  ```powershell
  schtasks /Delete /TN "DahemSearchEngine" /F
  ```

### Comprobar que está corriendo

```powershell
curl http://localhost:4111/health
```

Si responde `{"status":"ok",...}`, la sección **Inventario** aparecerá en el panel de admin.

---

## Cómo se usa desde el panel de admin

1. Con el SearchEngine corriendo, entra al panel: aparece la sección **Inventario**.
2. **Escanear inventario** → el panel llama a `/scan`; verás la tabla con código, tipo,
   título, año, peso, valoración y género.
3. **Cargar a BD** → el panel envía esos datos al backend (`POST /admin/catalog/import`),
   que **deduplica por el `code`** del inventario (`P1`, `S2`...): inserta solo los títulos
   cuyo código aún no está en la base de datos y omite los existentes (importación en bloque).

> El código del inventario físico (`P1`, `S2`) es el mismo campo `code` del catálogo: la
> importación lo guarda tal cual y lo usa como clave de deduplicación. No requiere
> migración de base de datos.

---

## Desarrollo

```bash
go test ./...     # tests del parser de nombres
go vet ./...
go run . -scan    # escanea examples/ e imprime el JSON
```

Estructura:

```
main.go                     arranque y modo -scan
internal/model/             estructuras del contrato JSON
internal/scanner/           recorrido del disco + parseo de nombres (+ tests)
internal/enrich/            cliente TMDb (enriquecimiento)
internal/server/            servidor HTTP + configuración + CORS
```
