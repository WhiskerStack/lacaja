# Daher — Convenciones de arquitectura del panel admin

> Cómo se organiza el código del panel admin (React + Vite + TanStack Router). Estructura de carpetas, regla de dependencias y modularidad con contenedor IoC (awilix).
> Complementa a `documentacion_tecnica_panel_admin.md` (stack), `documentacion_no_tecnica_del_panel_admin.md` (funcional) y `documentacion_del_dominio_y_el_modelo_de_datos.md` (entidades y DTOs).
> Convención de código: identificadores en inglés (igual que el modelo de datos); texto explicativo en español.

**Última actualización:** 2026-06-02

---

## 0. En qué se diferencia del landing (leer primero)

El landing y el admin comparten *filosofía* (vertical slicing, screaming architecture, dominio en clases) pero **no las decisiones de infraestructura**, porque sus restricciones son opuestas (ver `documentacion_tecnica_panel_admin.md` §0).

| Tema | Landing | Admin (este documento) |
|---|---|---|
| Render | Astro SSG + islas Preact | SPA React + Vite |
| Routing | `pages/` file-based de Astro | TanStack Router |
| Estado servidor | índice JSON estático + fetch | TanStack Query contra NestJS |
| Estado local | nanostores | TanStack Query + estado React local |
| Persistencia cliente | Dexie (Mi lista) | ninguna; todo vive en el backend |
| Operación dominante | **lectura** (catálogo) | **escritura** (CRUD del catálogo) |
| IoC | **sin** contenedor (cableado manual, por el bundle de <100KB) | **awilix** (sí hay contenedor; ver §6) |

La diferencia de IoC es la más importante de este documento y se justifica en §6: lo que en el landing era complejidad sin pagador, aquí sí paga.

---

## 1. Principios

Los mismos tres del landing, con una variante en el tercero:

1. **Screaming architecture.** La raíz de `src/` grita el negocio del admin (catalog, submissions, requests, pricing, users, publish), no `components/` o `services/`.
2. **Vertical slicing.** Cada feature es una rebanada autocontenida: UI, lógica, tipos y dominio juntos.
3. **Inversión de control con contenedor (awilix).** Las dependencias entran por constructor, igual que en el landing, pero el cableado lo resuelve un **contenedor awilix** en vez de un archivo manual. El porqué en §6.

---

## 2. Estructura de carpetas

Los slices coinciden con las secciones del panel (`documentacion_no_tecnica_del_panel_admin.md` §3):

```
src/
  features/
    catalog/                 ← CRUD de audiovisuales, temporadas, capítulos
      domain/                ← Audiovisual, EpisodicContainer, Season, Episode
      api/                   ← CatalogApi (llamadas HTTP a NestJS)
      logic/                 ← CatalogService (orquesta dominio + api)
      ui/                    ← páginas y componentes React (shadcn)
      queries.ts             ← hooks de TanStack Query del slice
      types.ts               ← DTOs
    submissions/             ← listar y ver envíos por web, buscar por código/nombre
      domain/                ← Submission, SubmissionItem
      api/
      logic/
      ui/
      queries.ts
      types.ts
    requests/                ← solicitudes de contenido no disponible, cambio de estado
      domain/                ← ContentRequest (status: pending|available|notified)
      api/
      logic/
      ui/
      queries.ts
      types.ts
    pricing/                 ← tarifas configurables (normal, premiere)
      domain/                ← PriceRate
      api/
      logic/
      ui/
      queries.ts
      types.ts
    users/                   ← cuentas admin (bootstrap, alta desde dentro)
      domain/                ← AdminUser
      api/
      logic/
      ui/
      queries.ts
      types.ts
    auth/                    ← login, sesión, token contra NestJS
      api/
      logic/                 ← AuthService
      ui/
      types.ts
    publish/                 ← disparar POST /admin/publish y ver estado del build
      api/
      logic/                 ← PublishService
      ui/

  app/
    container.ts             ← contenedor awilix (registro de todo)
    http.ts                  ← cliente HTTP base (token, baseURL)
    router.tsx               ← árbol de rutas TanStack Router
    providers.tsx            ← QueryClientProvider, ContainerProvider, ThemeProvider

  shared/                    ← utilidades sin dueño (formato CUP, GB, fechas, helpers UI)
  components/ui/             ← componentes shadcn/ui (generados por su CLI)
  styles/
```

Nota sobre `components/ui/`: los componentes base de shadcn (Button, Dialog, Table...) viven donde su CLI los genera, no dentro de slices. Son primitivas de UI sin dominio, equivalente al `shared/` del landing pero con la ruta que shadcn espera.

---

## 3. Las capas dentro del slice

Casi iguales a las del landing, con una capa nueva (`api/`) y una distinta (`queries.ts` en vez de `store.ts`):

- **`domain/`** — clases de dominio con sus reglas. Idénticas en espíritu a las del landing y **compartibles** con él (ver §8). Cero imports de React/HTTP.
- **`api/`** — clases que hacen las llamadas HTTP a NestJS. Solo I/O: arman la request, devuelven DTOs planos. No tienen reglas. Reciben el cliente HTTP por constructor.
- **`logic/`** — clases de servicio que orquestan: llaman a `api/`, hidratan DTOs a instancias de `domain/`, aplican reglas vía el dominio, devuelven resultados. Reciben sus dependencias (la api, otros servicios) por constructor.
- **`queries.ts`** — hooks de TanStack Query que envuelven a los servicios para la UI: cache, estados de carga/error, invalidación tras mutaciones. Es el reemplazo de `store.ts` del landing para datos del servidor.
- **`ui/`** — páginas y componentes React con shadcn. Solo presentación; consumen los hooks de `queries.ts`. No contienen reglas ni llamadas HTTP directas.

Flujo típico (editar un audiovisual): la página llama a una mutation de `queries.ts` → la mutation invoca `catalogService.update(dto)` → el servicio valida vía la entidad `Audiovisual`, llama a `catalogApi.update(...)` → al volver, TanStack Query invalida la lista y refresca la UI.

---

## 3b. Clases de dominio (compartidas con el landing)

El dominio del admin **es el mismo negocio** que el del landing: un `Audiovisual` sigue generando su código y sabiendo si es estreno. La diferencia es que el admin sobre todo **escribe** estas entidades, mientras el landing las lee. Las clases son las mismas (idealmente un paquete compartido, §8).

```typescript
// features/catalog/domain/Audiovisual.ts  (idéntico al del landing)
export type AudiovisualType = 'movie' | 'series' | 'telenovela' | 'show' | 'anime';

export interface AudiovisualDTO {
  id: number;
  type: AudiovisualType;
  name: string;
  year: number;
  rating: number;
  sizeGb: number;
  isPremiere: boolean;
}

export class Audiovisual {
  constructor(
    public readonly id: number,
    public readonly type: AudiovisualType,
    public readonly name: string,
    public readonly year: number,
    public readonly rating: number,
    public readonly sizeGb: number,
    public readonly isPremiere: boolean,
  ) {}

  code(): string {
    const letter = this.type === 'movie' ? 'P' : 'S';
    return `${letter}${String(this.id).padStart(4, '0')}`;
  }

  isEpisodic(): boolean {
    return this.type !== 'movie';
  }

  /** Validación de negocio para el formulario de edición. */
  validate(): string[] {
    const errors: string[] = [];
    if (!this.name.trim()) errors.push('El nombre es obligatorio.');
    if (this.year < 1900) errors.push('Año inválido.');
    if (!this.isEpisodic() && this.sizeGb <= 0) errors.push('Una película necesita peso en GB.');
    return errors;
  }

  static fromJSON(d: AudiovisualDTO): Audiovisual {
    return new Audiovisual(d.id, d.type, d.name, d.year, d.rating, d.sizeGb, d.isPremiere);
  }

  toJSON(): AudiovisualDTO {
    return {
      id: this.id, type: this.type, name: this.name, year: this.year,
      rating: this.rating, sizeGb: this.sizeGb, isPremiere: this.isPremiere,
    };
  }
}
```

> La frontera de serialización aquí no es SSG sino la **API**: NestJS devuelve y recibe JSON. La regla de hidratar en la frontera es la misma — `fromJSON` al recibir, `toJSON` al enviar — solo que el borde es la capa `api/`, no el build de Astro.

---

## 4. Regla de dependencias

```
ui/ ──▶ queries ──▶ logic/ ──▶ api/ ──▶ http
                       │
                       └──▶ domain/ ──▶ shared/
```

- `domain/` es la capa más interna. Solo importa `shared/` y otras clases de su `domain/`. **Nunca** importa `api/`, `logic/`, `ui/`, React ni HTTP.
- `api/` importa `http` y los DTOs (`types.ts`). No importa `logic/` ni `ui/`. Devuelve DTOs planos.
- `logic/` importa `domain/`, `api/` y `shared/`. **Nunca** importa `ui/` ni `queries.ts`.
- `queries.ts` importa `logic/` (a través del contenedor, §6) y expone hooks. No tiene reglas.
- `ui/` importa `queries.ts`, `domain/` (para tipos/mostrar) y `components/ui`. No hace HTTP ni contiene reglas.
- **Entre slices:** no se importan `domain/`/`logic/` internos entre slices. Lo común sube a `shared/` o al paquete de dominio compartido.

Igual que en el landing, esto se puede vigilar con `eslint-plugin-boundaries`.

---

## 5. Routing (TanStack Router)

A diferencia de Astro (file-based), el admin define el árbol de rutas explícito en `app/router.tsx`. Cada ruta monta la página del slice correspondiente; el routing no contiene lógica.

```tsx
// app/router.tsx (esquemático)
import { createRoute } from '@tanstack/react-router';
import { CatalogListPage } from '../features/catalog/ui/CatalogListPage';
import { requireAuth } from '../features/auth/logic/guard';

export const catalogRoute = createRoute({
  path: '/catalog',
  beforeLoad: requireAuth,           // guard propio (token NestJS), no Clerk
  component: CatalogListPage,
});
```

El guard `requireAuth` reemplaza al de Clerk (descartado en el stack técnico §3): valida el token emitido por NestJS antes de entrar a cualquier ruta protegida.

---

## 6. Inversión de control con awilix

### 6.1. Por qué aquí sí un contenedor (y en el landing no)

En el landing se descartó todo contenedor IoC por el presupuesto de <100KB de JS: los contenedores con `reflect-metadata` pesan y van al bundle del navegador. **En el admin esa restricción no existe** — SPA interna, 2-3 usuarios, sin presión de banda.

Awilix encaja por tres razones:

1. **Sin decoradores ni `reflect-metadata`.** Su modo `PROXY` (o `CLASSIC`) resuelve dependencias por nombre, sin metadata reflejada. No arrastra el peso que descartamos en el landing ni complica el build de Vite.
2. **El grafo del admin es mayor que el del landing.** Por slice hay api + service + a veces dependencias entre servicios (p.ej. `publish` depende del cliente HTTP; `catalog` de su api). Un contenedor evita cablear todo a mano y re-cablearlo en cada test.
3. **Una SPA tiene un punto de arranque único** donde registrar el contenedor (`app/`), cosa que el SSG del landing no tenía de forma natural.

> Esto es coherente con el resto del proyecto: el backend NestJS ya usa DI por contenedor. El admin sigue esa línea; el landing es la excepción justificada por el peso.

### 6.2. Servicios como clases, dependencias por constructor

Igual que en el landing: las dependencias entran por constructor. La diferencia es quién las inyecta (el contenedor, no un archivo manual).

```typescript
// features/catalog/api/CatalogApi.ts
import type { HttpClient } from '../../../app/http';
import type { AudiovisualDTO } from '../types';

export class CatalogApi {
  constructor(private readonly http: HttpClient) {}

  list(): Promise<AudiovisualDTO[]> {
    return this.http.get('/admin/catalog');
  }

  update(id: number, dto: AudiovisualDTO): Promise<AudiovisualDTO> {
    return this.http.put(`/admin/catalog/${id}`, dto);
  }
}
```

```typescript
// features/catalog/logic/CatalogService.ts
import { Audiovisual } from '../domain/Audiovisual';
import type { CatalogApi } from '../api/CatalogApi';

export class CatalogService {
  constructor(private readonly catalogApi: CatalogApi) {}

  async list(): Promise<Audiovisual[]> {
    const dtos = await this.catalogApi.list();
    return dtos.map(Audiovisual.fromJSON);          // hidratar en la frontera (API)
  }

  async update(entity: Audiovisual): Promise<Audiovisual> {
    const errors = entity.validate();               // la regla vive en el dominio
    if (errors.length) throw new Error(errors.join(' '));
    const saved = await this.catalogApi.update(entity.id, entity.toJSON());
    return Audiovisual.fromJSON(saved);
  }
}
```

### 6.3. Registro en el contenedor

```typescript
// app/container.ts
import { createContainer, asClass, asValue, InjectionMode } from 'awilix';
import { HttpClient } from './http';
import { CatalogApi } from '../features/catalog/api/CatalogApi';
import { CatalogService } from '../features/catalog/logic/CatalogService';
import { PublishService } from '../features/publish/logic/PublishService';

export function buildContainer(token: () => string | null) {
  const container = createContainer({ injectionMode: InjectionMode.CLASSIC });
  // CLASSIC = inyecta por nombre de parámetro del constructor; sin decoradores.

  container.register({
    http: asClass(HttpClient).singleton().inject(() => ({ getToken: token })),
    catalogApi: asClass(CatalogApi).singleton(),
    catalogService: asClass(CatalogService).singleton(),
    publishService: asClass(PublishService).singleton(),
  });

  return container;
}

export type AppContainer = ReturnType<typeof buildContainer>;
```

awilix resuelve `CatalogService(catalogApi)` y `CatalogApi(http)` por el **nombre del parámetro** del constructor (`catalogApi`, `http`), que debe coincidir con la clave registrada. Sin `reflect-metadata`, sin decoradores.

> Dos modos de inyección, elige uno y sé consistente: **CLASSIC** lee el nombre del parámetro posicional, así que los constructores van tal como aquí (`constructor(private readonly catalogApi: CatalogApi)`). **PROXY** inyecta un objeto y el constructor desestructura (`constructor({ catalogApi }: { catalogApi: CatalogApi })`). CLASSIC encaja mejor con clases de constructor tipado como las de este documento; PROXY es más tolerante a minificación. Para Vite con nombres preservados en dev, CLASSIC va bien; si la minificación de producción renombra parámetros, PROXY es más seguro. Decidir al configurar el build.

### 6.4. Puente contenedor → React

El contenedor se expone por contexto y los hooks de `queries.ts` lo consumen:

```tsx
// app/providers.tsx
import { createContext, useContext } from 'react';
import type { AppContainer } from './container';

const ContainerCtx = createContext<AppContainer | null>(null);
export const ContainerProvider = ContainerCtx.Provider;

export function useService<T>(name: string): T {
  const c = useContext(ContainerCtx);
  if (!c) throw new Error('ContainerProvider ausente');
  return c.resolve<T>(name);
}
```

```tsx
// features/catalog/queries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useService } from '../../app/providers';
import type { CatalogService } from './logic/CatalogService';
import type { Audiovisual } from './domain/Audiovisual';

export function useCatalogList() {
  const service = useService<CatalogService>('catalogService');
  return useQuery({ queryKey: ['catalog'], queryFn: () => service.list() });
}

export function useUpdateAudiovisual() {
  const service = useService<CatalogService>('catalogService');
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entity: Audiovisual) => service.update(entity),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog'] }),
  });
}
```

La UI nunca toca el contenedor ni los servicios directamente: solo usa los hooks.

---

## 7. Testing

- **`domain/`** → unitario puro con Vitest, sin mocks. `new Audiovisual(...).validate()`, `.code()`. Lo más valioso y compartido con el landing.
- **`api/`** → test con un `http` fake (o `msw` para simular NestJS). Verifica que arma bien la request y mapea la respuesta.
- **`logic/`** → unitario pasando una `api` fake por constructor. El contenedor no estorba: en test se instancia el servicio a mano (`new CatalogService(fakeApi)`) o se registra el fake en un contenedor de prueba.
- **`queries.ts` / `ui/`** → test de componente con un QueryClient de prueba y un contenedor con servicios fake; lo justo donde aporte.
- **Flujos completos** → Playwright contra el panel servido (login, editar, publicar).

awilix facilita el testing precisamente porque las dependencias entran por constructor: se puede armar un contenedor de test que registre fakes con `asValue`/`asClass`, o saltarse el contenedor e instanciar el servicio directo.

---

## 8. Compartir dominio con el landing

El `domain/` del admin y el del landing son **el mismo negocio**. Tres opciones, en orden de preferencia:

1. **Paquete compartido** (`@daher/domain`) consumido por ambos. Una sola fuente de verdad de las reglas (código de audiovisual, totales, validación). Recomendado si el monorepo lo permite.
2. **Copia sincronizada** de las clases entre repos. Simple pero corre el riesgo de divergir.
3. **Nada compartido** (cada app su copia). Solo si los dominios empiezan a separarse de verdad.

Coincide con la decisión abierta del stack técnico (§4 de `documentacion_tecnica_panel_admin.md`): si se hace el paquete común, el contrato de auth y los DTOs viven ahí también.

---

## 9. Resumen operativo

- La raíz `features/` grita el negocio del admin (`catalog`, `submissions`, `requests`, `pricing`, `users`, `auth`, `publish`).
- Cada feature es un slice con `domain/ api/ logic/ ui/ queries.ts types.ts`.
- El negocio se modela como **clases de dominio**, las mismas del landing (idealmente paquete compartido).
- **Hidratar en la frontera de la API:** `fromJSON` al recibir de NestJS, `toJSON` al enviar.
- Dependencias por constructor, cableadas por **awilix** (modo CLASSIC/PROXY, sin `reflect-metadata`).
- Datos del servidor por **TanStack Query**; el contenedor se consume vía hooks, no desde la UI directa.
- Routing explícito con **TanStack Router**; guard propio de auth (no Clerk).
- A diferencia del landing: SPA React, hay contenedor IoC, y la persistencia vive en el backend, no en el cliente.