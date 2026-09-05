Landing público de **La Caja**: catálogo audiovisual de consulta. Web estática (Astro SSG) con
islas interactivas en Preact. **No vende ni reproduce contenido**: muestra el inventario, deja
armar una lista y enviarla al negocio por cuatro vías.

El proyecto es autónomo (no depende de un monorepo externo) y utiliza clases de dominio propias
(`src/domains/`) para las reglas de negocio.

## Stack

Astro 5 (SSG puro) · Preact + `@preact/signals` · nanostores (`@nanostores/preact`,
`@nanostores/persistent`) · MiniSearch · Dexie (IndexedDB) · Tailwind v3 + daisyUI v4 ·
`lite-youtube-embed` · `@vite-pwa/astro` (Workbox) · `astro:assets` + sharp. Tests: Vitest + Playwright.

## Arquitectura

Vertical slicing + screaming architecture. Cada *feature* contiene su propia lógica, UI y tipos,
y se comunica a través de servicios inyectados en el contenedor raíz (`src/app/container.ts`).

```
src/
  app/
    container.ts   # composition root (servicios)
    db.ts          # Dexie (listItems + meta)
    stores/        # toasts, etc.
    ui/            # Navbar, BottomBar, ToastHost
  data/
    catalog.json   # fuente del catálogo (generada por scripts)
    catalog.sample.json  # muestra inicial
  domains/         # clases de dominio puras (sin I/O ni frameworks)
    Audiovisual.ts (en features/audiovisual/domain/), Episode, Season, List, ListItem, PriceRate, Submission, etc.
  features/
    audiovisual/   # dominio Audiovisual (entidad raíz)
    catalog/       # lógica de build (getStaticPaths, filtros, precios) y UI (detalle, carrusel, grid)
    common/        # tipos compartidos y helpers (códigos)
    my-list/       # lógica de lista (Dexie, store, drawer) y UI (Drawer, useList)
    search/        # búsqueda con MiniSearch (modo local/loading) y UI (SearchView)
    submission/    # envío de lista (4 vías: WhatsApp, TXT, portapapeles, compartir) y UI (modal)
  layouts/Base.astro
  pages/           # routing (index, biblioteca, buscar, detalle /p/[id], /s/[id] y rutas de temporada/capítulo)
  shared/          # utilidades (format, urls, env, message-from-error)
  styles/global.css
scripts/           # sincronización, enriquecimiento, índices, utilidades
tests/
  e2e/             # Playwright
  unit/            # Vitest
```

Regla de dependencias: `ui → logic → domain → shared`; `ui → store`. El dominio no importa
Preact/Astro ni I/O. Las clases de dominio cruzan la frontera SSG/Dexie/API como **DTOs planos**
y se hidratan con `fromJSON`/`toJSON` en los bordes. Stores guardan DTOs, no instancias.

## Scripts

| Script | Acción |
|---|---|
| `pnpm sync` | ejecuta `sync-catalog`, `enrich-catalog` y `build-search-index` en serie |
| `pnpm sync-catalog` | lee archivos `.xlsx` de `dataset/` y genera `src/data/catalog.json` (evita duplicados por código) |
| `pnpm enrich-catalog` | enriquece el catálogo con datos de TMDB (póster, descripción, reparto, tráiler, rating); empareja por nombre + año + país |
| `pnpm translate-descriptions` | traduce descripciones al español usando Ollama (requiere `OLLAMA_URL` y `OLLAMA_MODEL`) |
| `pnpm build-search-index` | genera `public/search-index.json` y `public/library-index.json` desde `catalog.json` |
| `pnpm check-enrichment` | reporta items sin enriquecer o enriquecidos sin imagen |
| `pnpm find-duplicates` | busca posibles duplicados por nombre, año y tipo (umbral de similitud 85%) |
| `pnpm disable-duplicates` | desactiva los duplicados (mantiene el código más bajo) |
| `pnpm dev` | `astro dev` (previamente genera índices si no existen) |
| `pnpm build` | `astro build` (SSG en `dist/`) |
| `pnpm preview` | sirve el build |
| `pnpm test` | unitarios (Vitest) |
| `pnpm test:e2e` | E2E (Playwright contra el build) |
| `pnpm lint` | `astro check` |

> **Nota**: Los scripts de sincronización y enriquecimiento requieren variables de entorno (ver `.env.example`).
> `TMDB_API_KEY` es obligatoria para `enrich-catalog`; `OLLAMA_URL` y `OLLAMA_MODEL` son opcionales para traducciones.

### Emparejamiento con TMDB

El match se acota por **nombre + año + país**. El año se consulta en el endpoint del tipo
(`search/movie` / `search/tv`, los únicos que lo admiten: `search/multi` lo ignora) y ordena los
candidatos por cercanía. El país sale de `region`, mapeada a ISO 3166-1 (`EU` y `USA` → `US`,
`España` → `ES`, …); las regiones inservibles (`Desconocido`, vacías, o un año colado por filas mal
parseadas) se ignoran y el match se decide como antes.

TMDB no deja filtrar la búsqueda por país de origen, así que el país se aplica sobre los
candidatos: en series ya viene en el resultado (`origin_country`) y en películas hay que pedir los
detalles (`production_countries`), por eso con país esperado se miran hasta 3 candidatos en vez de
quedarse con el primero. Desempata dentro de la misma cercanía de año, por delante de la
popularidad —"The Office" 2005 estadounidense frente a la británica—, pero nunca por encima del
año. Si ninguno coincide no se descarta nada (coproducciones, fichas incompletas): se enriquece con
el mejor por año y se avisa por consola con `⚠`.

### Géneros

Cada ítem del catálogo lleva `genres: string[]` (nunca vacío; como mínimo `['Sin género']`).
`enrich-catalog` los completa desde TMDB mapeando por **ID numérico** de género, no por el nombre
localizado, y los fusiona con los que ya trae el Excel. Ese enriquecimiento tiene su propio flag
`genresEnriched`, independiente de `enriched`: sin él, los ítems marcados como enriquecidos antes
de que existieran los géneros nunca volverían a consultarse.

## Índices de búsqueda

`scripts/build-search-index.mjs` lee `src/data/catalog.json` y emite en `public/`:

- `search-index.json` — `{ v, items: [[code, title], …] }` (autocomplete, minúsculo).
- `library-index.json` — `{ v: 2, genres, regions, languages, items: [[code, title, year, type, gi, ri, li], …] }`.
  `gi` es un **arreglo** de índices de género (un ítem puede tener varios); `ri`/`li` siguen siendo índices simples.

Formato nivel 1 (diccionarios + tuplas posicionales). Solo entra el item completo, no temporadas ni capítulos.
La búsqueda en cliente usa MiniSearch con `processTerm` que quita acentos (NFD) y fuzzy+prefix;
rutea por código (`P0023`, `S1122-3-10`) a prefijo exacto.

## Variables de entorno (`.env.example`)

- `SITE` — URL pública del sitio (usada por Astro para canonical, sitemap, etc.).
- `TMDB_API_KEY` — clave de API de TheMovieDB (necesaria para enriquecimiento).
- `OLLAMA_URL` (opcional) — URL de Ollama para traducción de descripciones (por defecto `http://localhost:11434/api/generate`).
- `OLLAMA_MODEL` (opcional) — modelo de Ollama (por defecto `llama3.1:8b`).

El catálogo se construye a partir de archivos Excel en `dataset/`. El SSG genera el sitio estático
sin necesidad de backend en tiempo de construcción.

## Fases de implementación (actual)

- **Catálogo**: sincronización desde Excel, enriquecimiento con TMDB, traducción de descripciones.
- **Frontend**: SSG con rutas para películas, series, temporadas y capítulos. Búsqueda local con MiniSearch.
- **Mi lista**: almacenamiento en Dexie (IndexedDB), drawer y badge con contador.
- **Envío**: cuatro vías (WhatsApp, TXT, portapapeles, compartir nativo) sin necesidad de cuenta.
- **PWA**: Service Worker con Workbox, caché de imágenes e índices, modo offline.
- **Testing**: unitario (dominio, lógica) y E2E (smoke tests).

## Notas

- Las imágenes del catálogo se obtienen de TMDB durante el enriquecimiento y se sirven optimizadas con `astro:assets`.
- Los iconos PWA en `public/icons/` son placeholders (ver su README).
- La sincronización de `dataset/` evita duplicados basándose en el código (P1, S1, etc.).
- La lista se guarda localmente y no requiere autenticación (modo anónimo).
- El envío por WhatsApp usa el número configurado en `PUBLIC_WHATSAPP_NUMBER`.