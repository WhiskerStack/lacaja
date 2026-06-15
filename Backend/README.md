# @dahem/backend

Backend de **Dahem** (NestJS + Drizzle + Postgres). Es la frontera de escritura, la fuente
de verdad del catálogo y el generador del SSG del landing. Da servicio al landing público
(cuentas, envíos por web, solicitudes, búsqueda fallback) y al panel admin (todo el CRUD).

Arquitectura: vertical slicing / screaming architecture, **Repository + Criteria** sobre
Drizzle, DI por el contenedor de NestJS. Ver `Docs/documentacion_tecnica_sobre_arquitectura_del_backend.md`.

## Estructura

```
src/
  modules/                  ← la raíz grita el negocio
    catalog/                ← audiovisuales, jerarquía episódica, géneros/reparto/trailers, SearchProvider
    search/                 ← /search y /search/suggest (PostgresSearchProvider: FTS + pg_trgm + ruteo por código)
    account/                ← registro/login del cliente USER (landing)
    list/                   ← "Mi lista" persistida del usuario
    requests/               ← solicitudes de contenido no disponible
    submission/             ← envío de lista por web: snapshot congelado + totales
    pricing/                ← tarifas configurables (normal/premiere)
    admin/                  ← cuentas del panel (bootstrap + alta desde dentro)
    auth/                   ← JWT + argon2, guards, decoradores (@Public, @AdminOnly, @CurrentUser)
    publish/                ← regeneración del SSG (subproceso + lock) + cron 02:00
  shared/
    criteria/               ← Criteria, CriteriaToDrizzleTransformer (allowlist), CollectionFilter
    database/               ← DatabaseModule (token DRIZZLE) + schema.ts (barrel para drizzle-kit)
    config/                 ← @nestjs/config tipado (valida DATABASE_URL, JWT_SECRET)
    http/                   ← filtro global de excepciones
  app.module.ts  main.ts  seed.ts
drizzle/
  0001_search.sql           ← migración manual: pg_trgm + tsvector con pesos + índices GIN
```

Cada módulo tiene `domain/ application/ infrastructure/ http/ *.module.ts`. El puerto del
repositorio es una **clase abstracta** (token de DI) y se ata a su adapter Drizzle en el `*.module.ts`.

## Requisitos

- Node >= 20, pnpm (monorepo).
- Una base **Postgres** accesible por `DATABASE_URL`.

## Configuración

Copia `.env.example` a `.env` y ajústalo:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/dahem
JWT_SECRET=<secreto largo y aleatorio>
JWT_EXPIRES_IN=7d
PORT=3000
LANDING_ORIGIN=http://localhost:4321
ADMIN_ORIGIN=http://localhost:5173
BUILD_COMMAND=...   # comando que regenera el SSG (placeholder por defecto)
```

`DATABASE_URL` y `JWT_SECRET` son obligatorias: el arranque falla si faltan.

## Migraciones y datos

```bash
pnpm --filter @dahem/backend db:generate   # genera SQL de migración desde el esquema Drizzle
pnpm --filter @dahem/backend db:migrate     # aplica las migraciones
# Paso de búsqueda (manual, ver más abajo):
psql "$DATABASE_URL" -f Backend/drizzle/0001_search.sql
pnpm --filter @dahem/backend seed           # datos de demostración
```

Alternativa rápida en desarrollo: `db:push` empuja el esquema sin generar archivos de migración.

### Paso de búsqueda (`drizzle/0001_search.sql`)

La búsqueda léxica (FTS + `pg_trgm`) usa una columna `search_vector` **generada** con pesos
(título A, géneros B, reparto C, descripción D) y la extensión `pg_trgm`. Como las columnas
generadas con pesos y las extensiones son incómodas de expresar en Drizzle, ese paso vive en
una migración SQL hecha a mano que hay que ejecutar **después** de `db:migrate`:

```bash
psql "$DATABASE_URL" -f Backend/drizzle/0001_search.sql
```

Crea: `CREATE EXTENSION pg_trgm`, columnas auxiliares `genres_text`/`cast_text`, la columna
`search_vector tsvector GENERATED ALWAYS … STORED`, y los índices GIN para FTS y trigramas.
(El índice B-tree de `code` ya lo crea el esquema Drizzle.)

> Para que la búsqueda léxica devuelva géneros/reparto, el admin debe poblar `genres_text` y
> `cast_text` al editar (desnormalización para el tsvector). La búsqueda por título y por
> código funciona sin ese paso.

## Ejecutar

```bash
pnpm --filter @dahem/backend start:dev   # nest start -b swc --watch
pnpm --filter @dahem/backend build       # nest build -b swc
pnpm --filter @dahem/backend test        # vitest run
pnpm --filter @dahem/backend lint        # tsc --noEmit
```

## Endpoints

Auth: JWT Bearer. Por defecto todas las rutas requieren token salvo las marcadas `@Public()`.
Las rutas `@AdminOnly()` exigen un token de audiencia `admin`.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/catalog` | público | Búsqueda con filtros + paginación |
| GET | `/catalog/:id` | público | Detalle (con temporadas/trailers/reparto) |
| POST/PUT/DELETE | `/admin/catalog[/:id]` | admin | CRUD de audiovisuales |
| GET/POST/DELETE | `/admin/catalog/{genres,regions,languages,cast}` | admin | Catálogos y reparto |
| POST/DELETE | `/admin/catalog/:id/{seasons,trailers,cast}`, `/admin/catalog/{seasons,episodes,trailers}/:id` | admin | Jerarquía episódica, trailers, vínculo de reparto |
| GET | `/search?q=` | público | Búsqueda: rutea código → exacto/prefijo; si no, FTS+trgm |
| GET | `/search/suggest?q=` | público | Sugerencias as-you-type (sólo título) |
| POST | `/account/register` | público | Alta de cliente USER |
| POST | `/account/login` | público | Login de cliente USER |
| GET/PUT | `/list` | USER | Leer/guardar "Mi lista" |
| POST | `/requests` | USER | Registrar solicitud de contenido |
| GET | `/admin/requests` | admin | Listar solicitudes (filtro por estado) |
| PATCH | `/admin/requests/:id/status` | admin | Cambiar estado |
| POST | `/submission` | USER | Enviar lista por web (snapshot + totales) |
| GET | `/admin/submissions` | admin | Listar/buscar por código |
| GET | `/admin/submissions/:id` | admin | Detalle de un envío |
| GET | `/pricing` | público | Tarifas vigentes |
| PUT | `/admin/pricing` | admin | Actualizar normal/premiere |
| POST | `/admin/bootstrap` | público* | Crea el primer admin (sólo si no existe ninguno) |
| GET | `/admin/users` | admin | Listar admins |
| POST | `/admin/users` | admin | Crear admin desde dentro |
| POST | `/auth/admin/login` | público | Login de admin |
| POST | `/admin/publish` | admin | Disparar regeneración del SSG (rate-limited) |
| GET | `/admin/publish/status` | admin | Estado de la última publicación |

Endpoints de auth con rate limit reforzado (login/registro/bootstrap/publish).

## Decisiones y stubs (MVP)

- **Publish sin BullMQ** (stack §7, opción 3): build síncrono protegido por un **lock en
  proceso**; se registra cada corrida en `publish_run`. El cron de 02:00 dispara sólo si
  "el catálogo cambió", con un **stub por timestamp** (`hasChangesSince`); en producción se
  ataría a un `updated_at` real del catálogo. `BUILD_COMMAND` es un placeholder configurable.
- **Search**: `SearchProvider` abstracto + `PostgresSearchProvider` para poder migrar a
  Meilisearch cambiando sólo el binding (búsqueda §4.2).
- **List**: el merge de "Mi lista" lo resuelve el cliente; el backend persiste el conjunto
  de ítems (PUT reemplaza).
- **Dominio compartido**: se reutiliza `@dahem/domain` (Audiovisual, List, WebSubmission,
  PriceRate, User, AdminUser, …) como única fuente de verdad de las reglas.
