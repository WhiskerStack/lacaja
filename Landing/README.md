# @daher/landing

Landing público de **Daher**: catálogo audiovisual de consulta. Web estática (Astro SSG) con
islas interactivas en Preact. **No vende ni reproduce contenido**: muestra el inventario, deja
armar una lista y enviarla al negocio por cuatro vías.

Forma parte del monorepo pnpm de Daher y reutiliza las reglas de negocio del paquete
compartido `@daher/domain` (clases `Audiovisual`, `EpisodicContainer`, `Season`, `Episode`,
`List`, `ListItem`, `User`, códigos, `DEFAULT_RATE`).

## Stack

Astro 5 (SSG puro) · Preact + `@preact/signals` · nanostores (`@nanostores/preact`,
`@nanostores/persistent`) · MiniSearch · Dexie (IndexedDB) · Tailwind v3 + daisyUI v4 ·
`lite-youtube-embed` · `@vite-pwa/astro` (Workbox) · `astro:assets` + sharp. Tests: Vitest + Playwright.

## Arquitectura

Vertical slicing + screaming architecture (ver `Docs/documentacion_tecnica_sobre_arquitectura_del_landing.md`).

```
src/
  features/
    catalog/    { domain via @daher/domain, ui/, logic/, types.ts }   Home, Biblioteca, detalle
    search/     { ui/, logic/SearchService, store.ts, types.ts }       buscador 3-state loading|local|api
    my-list/    { ui/, logic/ListService, store.ts, types.ts }         drawer, totales, Dexie
    submission/ { domain/Submission, ui/, logic/, types.ts }           4 vías de envío
    account/    { ui/, logic/, store.ts, types.ts }                    login/registro modal, sesión
  app/
    container.ts   composition root (cablea servicios)
    db.ts          Dexie (listItems + meta)
    stores/        session, network, toast
    ui/            Navbar, BottomBar, NetworkBanner, ToastHost
  shared/          format (CUP/GB), urls, env — utilidades sin dominio
  layouts/Base.astro
  pages/           routing delgado (solo importa islas de slices)
  data/catalog.sample.json   fuente de catálogo en build-time
  styles/global.css
scripts/build-search-index.mjs
```

Regla de dependencias: `ui → logic → domain → shared`; `ui → store`. El dominio no importa
Preact/Astro ni I/O. Las clases de dominio cruzan la frontera SSG/Dexie/API como **DTOs planos**
y se hidratan con `fromJSON`/`toJSON` en los bordes. Stores guardan DTOs, no instancias.

## Scripts

| Script | Acción |
|---|---|
| `pnpm dev` | genera índices + `astro dev` |
| `pnpm build` | genera índices + `astro build` (SSG en `dist/`) |
| `pnpm preview` | sirve el build |
| `pnpm test` | unitarios (Vitest) |
| `pnpm test:e2e` | E2E (Playwright contra el build) |
| `pnpm lint` | `astro check` |

> No ejecutar `pnpm install` por slice: el lockfile del monorepo es compartido.

## Índices de búsqueda

`scripts/build-search-index.mjs` lee `src/data/catalog.sample.json` y emite en `public/`:

- `search-index.json` — `{ v, items: [[code, title], …] }` (autocomplete, minúsculo).
- `library-index.json` — `{ v, genres, regions, languages, items: [[code, title, year, type, gi, ri, li], …] }`.

Formato nivel 1 (diccionarios + tuplas posicionales, especificaciones §4.4). Solo entra el item
completo, no temporadas ni capítulos (funcional §6.4.2). El script corre en `prebuild`/`dev`/`build`.
La búsqueda en cliente usa MiniSearch con `processTerm` que quita acentos (NFD) y fuzzy+prefix;
rutea por código (`P0023`, `S1122-3-10`) a prefijo exacto. Si el índice no carga (timeout 12s),
cae a modo `api` contra `PUBLIC_API_URL/search`.

## Variables de entorno (`.env.example`)

- `PUBLIC_API_URL` — backend NestJS para fallback de búsqueda, `/pricing` y escrituras (auth, envío web, solicitudes).
- `PUBLIC_WHATSAPP_NUMBER` — número del negocio para `wa.me`.
- `SITE` — URL pública del sitio.

En build-time el catálogo se lee del JSON de muestra: el SSG construye standalone sin backend.
El API solo se consulta en runtime (y degrada con gracia si no está).

## Fases de implementación

- **F1 — MVP** (este código): páginas SSG (Home, Biblioteca, Buscar, detalles), Mi lista en Dexie,
  4 vías de envío (WhatsApp/TXT/copiar sin cuenta; web con sesión local optimista), buscador con
  índice local, imágenes con `astro:assets`.
- **F2 — backend + auth**: endpoints reales NestJS (auth, Mi lista, solicitudes, envío web), webhook de rebuild.
- **F3 — offline + PWA**: `@vite-pwa/astro` con Workbox (configurado), indicador de red (hecho),
  fallback API de búsqueda (hecho), sincronización offline-first de Mi lista con la cuenta.
- **F4 — optimizaciones**: hash en nombres de índices, caché de build de imágenes, medición en 3G.

## Notas / stubs

- Las imágenes de muestra son URLs remotas (`picsum.photos`); `astro.config.mjs` las habilita para
  `astro:assets`. En producción se descargan/optimizan en build (Opción A, especificaciones §7).
- Iconos PWA en `public/icons/` son placeholders (ver su README).
- `AccountService`/envío por web/solicitudes degradan a un modo local optimista cuando no hay
  `PUBLIC_API_URL` o backend (F1). En F2 apuntan a NestJS real.
- La sincronización de Mi lista anónimo→cuenta (merge) queda para F3.
