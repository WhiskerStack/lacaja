# @daher/admin — Panel de administración

Panel interno del vendedor de Daher. SPA en React + Vite que gestiona el
catálogo, los envíos por web, las solicitudes, las tarifas y las cuentas de
administrador, y dispara la publicación del landing. No es público: vive detrás
de login. Consume el backend NestJS.

## Stack

- **React 18 + Vite 6** (SPA, sin SSG).
- **TanStack Router** (árbol de rutas explícito, tipado fuerte) y **TanStack Query** (estado de servidor).
- **awilix** (IoC, modo CLASSIC) para cablear servicios por constructor.
- **shadcn/ui** (Tailwind + Radix), componentes copiados a `src/components/ui/`.
- **sonner** para toasts. **lucide-react** para iconos.
- **@daher/domain** como única fuente de verdad de las reglas de negocio.

## Arquitectura (vertical slicing)

Cada sección del panel es un slice autocontenido en `src/features/<slice>/`:

```
domain/    reglas de negocio (reutiliza @daher/domain). Sin React/HTTP.
api/       llamadas HTTP a NestJS. Solo I/O; devuelve DTOs.
logic/     servicios que orquestan dominio + api. Hidratan en la frontera.
ui/        páginas y componentes React. Solo presentación.
queries.ts hooks de TanStack Query que envuelven los servicios.
types.ts   DTOs del slice.
```

Regla de dependencias: `ui → queries → logic → api → http`, y `logic → domain → shared`.
El dominio no importa React ni HTTP. Se hidrata en la frontera de la API:
`fromJSON` al recibir, `toJSON` al enviar.

Slices: `catalog`, `submissions`, `requests`, `pricing`, `users`, `auth`,
`publish`, más `dashboard` (vista de inicio).

`src/app/` contiene el arranque: `container.ts` (awilix), `http.ts` (cliente
HTTP base con token + baseURL), `router.tsx` (árbol de rutas), `providers.tsx`
(QueryClientProvider, puente contenedor→React, ThemeProvider), `theme.tsx`.

## Inversión de control (awilix) — nota de build importante

El contenedor usa **modo CLASSIC**: resuelve cada dependencia por el **nombre
del parámetro** del constructor, que debe coincidir con la clave registrada
(`http`, `catalogApi`, `catalogService`...). Sin decoradores ni
`reflect-metadata`.

> **Caveat:** la minificación de producción renombra parámetros y rompería esa
> resolución. Mitigación aplicada: `vite.config.ts` activa
> `esbuild.keepNames: true`. Como red de seguridad adicional, el `HttpClient`
> recibe sus dependencias por una clave de objeto explícita (`httpDeps`,
> registrada con `asValue`), no por destructuración posicional. Si en el futuro
> apareciera un problema de resolución en build minificado, la alternativa es
> migrar a modo PROXY (constructores por destructuración).

El contenedor se construye una sola vez en `main.tsx` y se comparte entre el
router (para los guards `beforeLoad`) y los providers de React. La UI nunca toca
el contenedor: usa los hooks de `queries.ts`, que resuelven servicios vía
`useService<T>(name)`.

## Autenticación (propia, sin Clerk)

- Login con usuario/contraseña contra `POST /auth/admin/login`. El backend
  devuelve `{ admin, accessToken }`; el token se guarda en `localStorage`.
- `http.ts` añade `Authorization: Bearer <token>` y, ante un `401`, limpia la
  sesión y los guards llevan a `/login`.
- **Bootstrap:** el primer arranque (crear la cuenta inicial) se alcanza desde
  un enlace en la pantalla de login hacia `/bootstrap`. No se auto-detecta la
  ausencia de admin: el backend no expone un GET de estado y un sondeo con
  `POST /admin/bootstrap` chocaría con la validación de DTO (que corre antes del
  chequeo de existencia). Si ya hay un admin, el backend responde `409` y la
  pantalla lo informa.
- Rol único: todas las cuentas admin tienen los mismos permisos.

## Rutas

- `/login`, `/bootstrap` (públicas).
- Layout protegido (guard `requireAuth`): `/` (inicio), `/catalog`,
  `/submissions`, `/requests`, `/pricing`, `/users`.
- Acción **Publicar** en el header (`POST /admin/publish` + sondeo de
  `GET /admin/publish/status`).

## Endpoints consumidos (backend NestJS)

`/auth/admin/login`, `/admin/bootstrap`, `/admin/users`, `/admin/catalog`
(+ `/:id`, `/:id/seasons`, `/seasons/:id/episodes`, `/genres|regions|languages|cast`,
`/:id/cast`, `/:id/trailers`), `/admin/submissions` (+ `/:id`), `/admin/requests`
(+ `PATCH /:id/status`), `/pricing` + `PUT /admin/pricing`, `/admin/publish`
(+ `/status`). La URL base es `VITE_API_URL` (por defecto `http://localhost:3000`).

## Variables de entorno

Copia `.env.example` a `.env`:

```
VITE_API_URL=http://localhost:3000
```

## Scripts

| Script           | Acción                                  |
| ---------------- | --------------------------------------- |
| `pnpm dev`       | Servidor de desarrollo (Vite, HMR).     |
| `pnpm build`     | `tsc -b && vite build`.                 |
| `pnpm preview`   | Sirve el build de producción.           |
| `pnpm test`      | Tests con Vitest.                       |
| `pnpm lint`      | Chequeo de tipos (`tsc --noEmit`).      |

Desde la raíz del monorepo: `pnpm dev:admin`.

## Tests

Vitest + Testing Library (jsdom). Cubren:

- `cn()` (utilidad de clases).
- `CatalogService` con una api fake inyectada por constructor (validación vía
  dominio, normalización de peso, extracción de id de YouTube).
- Validación de formulario dirigida por la entidad de dominio `Audiovisual`.
- Resolución del contenedor awilix en modo CLASSIC con un fake (`asValue`).

## Notas / supuestos

- Donde el contrato exacto del backend no estaba fijado, se eligió una forma
  REST sensata centralizada en cada clase `*Api` (p.ej. listados de temporadas y
  trailers por GET anidado). Ajustar ahí si el backend difiere.
- El aviso de solicitudes por WhatsApp es semiasistido: se abre `wa.me` con un
  mensaje prerellenado y, tras abrirlo, la solicitud se marca como «avisado».
- El componente `Tabs` se implementó a mano (contexto + estado) en vez de añadir
  `@radix-ui/react-tabs`, para no sumar una dependencia que no estaba en la lista.
