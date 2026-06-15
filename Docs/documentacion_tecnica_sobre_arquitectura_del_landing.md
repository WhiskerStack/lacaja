# Dahem — Convenciones de arquitectura del frontend

> Cómo se organiza el código del landing (Astro + Preact). Define la estructura de carpetas, la regla de dependencias y el patrón de modularidad sin contenedor IoC.
> Complementa a `resumen_tecnico_stack_dahem.md` (tecnologías), `documentacion_del_dominio_y_el_modelo_de_datos.md` (entidades y DTOs) y `guia_tecnica_de_frontend_I.md` (arquitectura de rendering).
> Convención de código: igual que el modelo de datos, identificadores en inglés (`Audiovisual`, `level`, `sizeGb`); texto explicativo en español.

**Última actualización:** 2026-06-02

---

## 1. Principios

Tres ideas gobiernan la organización, en orden de prioridad:

1. **Screaming architecture.** La raíz de `src/` debe gritar *qué hace la app*, no con qué está construida. Al abrir el proyecto se ven los dominios del negocio (catalog, list, search, submission), no carpetas genéricas `components/` o `services/`.
2. **Vertical slicing.** Cada feature es una rebanada vertical autocontenida: su UI, su lógica, su estado y sus tipos viven juntos en la misma carpeta. Se trabaja una feature tocando una sola carpeta, no saltando entre cinco carpetas por capa.
3. **Inversión de control sin contenedor.** Las dependencias entran por el constructor de la clase de servicio, no se importan ni se instancian dentro de la lógica. El cableado real ocurre en un único *composition root*.

> Nota: esto reemplaza cualquier idea previa de organizar por capas (`services/`, `stores/`, `components/` en la raíz). Con vertical slicing las capas existen, pero **dentro** de cada slice, no en la raíz.

---

## 2. Estructura de carpetas

Los slices coinciden con los dominios del modelo de datos (`documentacion_del_dominio_y_el_modelo_de_datos.md` §2):

```
src/
  features/                  ← la raíz grita el negocio
    catalog/                 ← slice: Home, Biblioteca, detalle de audiovisual
      domain/                ← Audiovisual, EpisodicContainer, Season, Episode
      ui/                    ← islas Preact y componentes .astro del slice
      logic/                 ← servicios (CatalogService, SuggestionsService)
      store.ts               ← nanostores del slice (solo estado)
      types.ts               ← DTOs (AudiovisualDTO, SeasonDTO, EpisodeDTO)
    search/                  ← slice: buscador, índice MiniSearch, fallback API, modo loading|local|api
      domain/
      ui/
      logic/                 ← SearchService
      store.ts               ← estado del modo de búsqueda
      types.ts
    my-list/                 ← slice: drawer, totales, comparación de espacio, persistencia Dexie
      domain/                ← List, ListItem (cálculos de GB/precio como métodos)
      ui/
      logic/                 ← ListService
      store.ts
      types.ts
    submission/              ← slice: las cuatro vías (web, WhatsApp, TXT, copiar)
      domain/                ← Submission (genera el mensaje pre-formateado)
      ui/
      logic/                 ← SubmissionService
      types.ts
    account/                 ← slice: login/registro, sesión
      ui/
      logic/                 ← AccountService
      store.ts
      types.ts

  app/                       ← slice transversal: lo que pertenece a "la app entera"
    container.ts             ← COMPOSITION ROOT (cablea todo)
    db.ts                    ← instancia de Dexie / definición de tablas
    stores/                  ← stores verdaderamente globales (sesión, estado de red)

  shared/                    ← utilidades sin dueño de dominio (formato de precios CUP, GB, helpers)

  layouts/                   ← layouts Astro
  pages/                     ← routing delgado (ver §5)
  styles/
```

Regla para decidir dónde va algo: **si pertenece a un dominio del negocio, va en su slice.** Solo lo que no pertenece a ninguno (utilidades puras, cableado global) va en `app/` o `shared/`.

---

## 3. Las capas viven dentro del slice

Cada slice tiene las mismas capas internas. La frontera no se borra por estar juntas; se respeta por la regla de dependencias (§4).

- **`domain/`** — clases de dominio: las entidades del negocio con sus métodos y reglas adentro. `Audiovisual`, `EpisodicContainer`, `Season`, `Episode`, `List`, `ListItem`. Una clase `Audiovisual` sabe generar su propio código (`S1122`), decir si es estreno, calcular su precio. La regla vive *con* el dato, no en una función suelta. Cero imports de Preact/Astro. Ver §3b.
- **`logic/`** — clases de servicio / casos de uso. Orquestan el dominio y hablan con el exterior (Dexie, API, stores). No contienen las reglas de la entidad —esas están en `domain/`—; coordinan: "traer de Dexie, reconstruir instancias, pedirle el total a la `List`, escribir". Reciben sus dependencias por constructor (§6). Cero imports de Preact/Astro.
- **`store.ts`** — nanostores. **Solo estado y notificación de cambios, sin reglas de negocio.** Guarda el estado; los cálculos los hace el dominio.
- **`ui/`** — islas Preact y componentes `.astro`. **Solo presentación.** Llaman a `logic/`, leen de `store.ts`, y pueden usar instancias de dominio para mostrar (`audiovisual.code()`). No contienen reglas.

Flujo típico (agregar a Mi lista): la isla llama `listService.add(audiovisual)` → el servicio (`logic/`) pide a la entidad sus datos y escribe en Dexie → reconstruye la `List` y le pide `totalGb()` → actualiza el store → la isla y el badge del navbar reaccionan. Las reglas (qué cuenta, cómo se suma) están en `domain/`; el servicio solo orquesta.

---

## 3b. Clases de dominio

El modelo de negocio se expresa como clases con comportamiento, no como objetos de datos anémicos rodeados de funciones sueltas. Una entidad encapsula sus reglas. Los campos siguen el modelo de datos (`documentacion_del_dominio_y_el_modelo_de_datos.md` §4).

```typescript
// features/catalog/domain/Audiovisual.ts
export type AudiovisualType = 'movie' | 'series' | 'telenovela' | 'show' | 'anime';

export class Audiovisual {
  constructor(
    public readonly id: number,
    public readonly type: AudiovisualType,
    public readonly name: string,
    public readonly year: number,
    public readonly rating: number,
    public readonly sizeGb: number,      // solo significativo si no es episódico
    public readonly isPremiere: boolean,
  ) {}

  /** Código corto del documento funcional (§2): P0023 para película, S1122 para episódico. */
  code(): string {
    const letter = this.type === 'movie' ? 'P' : 'S';
    return `${letter}${String(this.id).padStart(4, '0')}`;
  }

  /** Precio según sea estreno o normal. La tarifa viene de PRICE_RATE (configurable). */
  price(rate: { normal: number; premiere: number }): number {
    return this.isPremiere ? rate.premiere : rate.normal;
  }

  isEpisodic(): boolean {
    return this.type !== 'movie';
  }
}
```

Para contenido episódico, la jerarquía se modela con sus propias clases. `EpisodicContainer` especializa a `Audiovisual` (no se llama `Series` porque aplica también a telenovela, show y anime — misma razón que la tabla en el modelo de datos). Cada nivel genera su tramo de código:

```typescript
// features/catalog/domain/EpisodicContainer.ts
import { Audiovisual } from './Audiovisual';
import { Season } from './Season';

export class EpisodicContainer extends Audiovisual {
  constructor(
    id: number,
    type: AudiovisualType,
    name: string,
    year: number,
    rating: number,
    isPremiere: boolean,
    public readonly seasons: Season[],
  ) {
    // sizeGb del contenedor se deriva de las temporadas, no se pasa: 0 en el base.
    super(id, type, name, year, rating, 0, isPremiere);
  }

  /** El peso real del contenedor episódico es la suma de sus temporadas (el campo base sizeGb queda en 0). */
  totalSizeGb(): number {
    return this.seasons.reduce((sum, s) => sum + s.sizeGb(), 0);
  }
}

// features/catalog/domain/Season.ts
import { Episode } from './Episode';

export class Season {
  constructor(
    public readonly parentCode: string,   // p.ej. "S1122"
    public readonly number: number,
    public readonly episodes: Episode[],
  ) {}

  code(): string {
    return `${this.parentCode}-${this.number}`;   // "S1122-3"
  }

  sizeGb(): number {
    return this.episodes.reduce((sum, e) => sum + e.sizeGb, 0);
  }
}

// features/catalog/domain/Episode.ts
export class Episode {
  constructor(
    public readonly seasonCode: string,   // p.ej. "S1122-3"
    public readonly number: number,
    public readonly sizeGb: number,
  ) {}

  code(): string {
    return `${this.seasonCode}-${this.number}`;   // "S1122-3-10"
  }
}
```

El cálculo de totales de "Mi lista" vive en una clase `List` que suma sus `ListItem` con métodos, en vez de funciones sueltas:

```typescript
// features/my-list/domain/List.ts
import { ListItem } from './ListItem';

export class List {
  constructor(public readonly items: ListItem[]) {}

  totalGb(): number {
    return this.items.reduce((sum, i) => sum + i.sizeGb, 0);
  }

  totalPrice(): number {
    return this.items.reduce((sum, i) => sum + i.price, 0);
  }

  /** §7.3 funcional: ¿cabe en el espacio que el usuario declaró? */
  fitsIn(spaceGb: number): boolean {
    return this.totalGb() <= spaceGb;
  }
}
```

`ListItem` es la entidad que conecta con la referencia por nivel del modelo de datos (`LIST_ITEM` / `DEXIE_LIST_ITEM`). Guarda el `level` (qué se agregó) y datos-snapshot (name, sizeGb, price) copiados al agregar, para no depender del catálogo vivo:

```typescript
// features/my-list/domain/ListItem.ts
export type ItemLevel = 'audiovisual' | 'season' | 'episode';

export interface ListItemDTO {
  code: string;          // PK en Dexie: "S1122", "S1122-3", "S1122-3-10"
  level: ItemLevel;
  targetId: number;      // id del audiovisual/season/episode según level
  name: string;          // snapshot
  sizeGb: number;        // snapshot
  price: number;         // snapshot
}

export class ListItem {
  constructor(
    public readonly code: string,
    public readonly level: ItemLevel,
    public readonly targetId: number,
    public readonly name: string,
    public readonly sizeGb: number,
    public readonly price: number,
  ) {}

  static fromJSON(d: ListItemDTO): ListItem {
    return new ListItem(d.code, d.level, d.targetId, d.name, d.sizeGb, d.price);
  }

  toJSON(): ListItemDTO {
    return {
      code: this.code, level: this.level, targetId: this.targetId,
      name: this.name, sizeGb: this.sizeGb, price: this.price,
    };
  }
}
```

### 3b.1. El problema de la frontera SSG (importante)

Astro SSG serializa los datos a JSON en build-time. **Una instancia de clase no sobrevive la serialización: cruza como objeto plano y pierde sus métodos.** Lo mismo al leer de Dexie o de la API: lo que vuelve es JSON, no una instancia. El modelo de datos ya define los DTOs planos (`AUDIOVISUAL_JSON`, `DEXIE_LIST_ITEM` en §5 de ese documento); aquí se reconstruyen a instancias.

Regla para evitar el caos de "a veces tiene métodos, a veces no": **hidratar en la frontera.** Cada clase de dominio ofrece un `fromJSON` (y un `toJSON` si se persiste), y el slice reconstruye la instancia en el punto de entrada —al leer del índice JSON, de Dexie o de la API— antes de pasarla a `logic/` o `ui/`.

```typescript
// features/catalog/types.ts — el DTO plano que viaja por SSG / API
export interface AudiovisualDTO {
  id: number;
  type: AudiovisualType;
  name: string;
  year: number;
  rating: number;
  sizeGb: number;
  isPremiere: boolean;
}

// features/catalog/domain/Audiovisual.ts (continuación)
export class Audiovisual {
  // ...constructor y métodos...

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

- **En páginas Astro (build-time):** se cargan los DTOs del índice de catálogo; si se necesita comportamiento en el frontmatter, se hidrata con `fromJSON`. Lo que se pasa a una isla como prop viaja como DTO plano (Astro lo serializa de todos modos); la isla hidrata al recibir si necesita métodos.
- **En islas (cliente):** al leer de Dexie o de la API, reconstruir con `fromJSON` antes de usar.
- **Al persistir en Dexie:** guardar `toJSON()` (objeto plano), no la instancia.

Esto mantiene una sola fuente de verdad de las reglas (la clase) y acota la conversión JSON↔instancia a los bordes del slice.

### 3b.2. Dónde NO usar clases

- **`store.ts`**: los nanostores guardan DTOs planos, no instancias. Hidratar al leer del store si se necesita comportamiento. (Los stores se comparan por referencia/igualdad estructural; las instancias complican esto.)
- **Props entre Astro e islas**: viajan como DTO; la isla hidrata.
- Datos de configuración o utilidades sin reglas: siguen siendo objetos/funciones en `shared/`. No todo necesita ser clase.

---

## 4. Regla de dependencias

Las flechas de importación apuntan en una sola dirección. Romper esto es lo único que se considera "deuda de arquitectura" aquí.

```
ui/  ───▶  logic/  ───▶  domain/  ───▶  shared/
 │           │             ▲
 └──▶ store ─┴─────────────┘
```

- `domain/` es la capa más interna del slice: clases con sus reglas. Puede importar de `shared/` y de otras clases de `domain/` del mismo slice. **Nunca importa de `logic/`, `ui/`, `store.ts`, Dexie, fetch ni nada de I/O.** El dominio no sabe de dónde vienen sus datos.
- `ui/` puede importar de `logic/`, `domain/`, `store.ts` y `shared/`.
- `logic/` puede importar de `domain/`, `shared/` y de otros `logic/` de su mismo slice. **Nunca importa de `ui/` ni de `store.ts`.**
- `shared/` no importa de nada de `features/` ni de `app/`.
- **Entre slices:** un slice no importa el `logic/` ni el `domain/` interno de otro. Si dos slices comparten una entidad o lógica, esa pieza sube a `shared/` (o a un slice de dominio común). Si un slice necesita *coordinar* con otro, se hace por stores globales en `app/stores/` o por el composition root, no por imports cruzados profundos.

Ejemplo concreto de la regla entre slices: `my-list` necesita datos del audiovisual al agregarlo, pero **no importa** `catalog/domain/Audiovisual`. En su lugar, la isla de `catalog` ya tiene la instancia y le pasa a `listService.add()` solo los datos-snapshot que `ListItem` necesita (code, name, sizeGb, price). Así `my-list` no depende de `catalog`.

Esto se puede vigilar con una regla de ESLint (`import/no-restricted-paths` o `eslint-plugin-boundaries`) más adelante; por ahora es disciplina.

---

## 5. El caso de `pages/` (routing en Astro)

Astro obliga a que `src/pages/` defina las rutas por convención de archivos. Eso choca de frente con "todo vive en slices". Resolución adoptada:

**`pages/` es una capa de routing delgada.** Cada archivo de página solo arma el layout e importa las islas/componentes desde el slice correspondiente. No contiene lógica ni UI propia.

```astro
---
// src/pages/biblioteca.astro
import Layout from '../layouts/Base.astro';
import { LibraryGrid } from '../features/catalog/ui/LibraryGrid';
---
<Layout>
  <LibraryGrid client:visible />
</Layout>
```

```astro
---
// src/pages/p/[id].astro — detalle de película
import Layout from '../../layouts/Base.astro';
import { MovieDetail } from '../../features/catalog/ui/MovieDetail';
import { getCatalogIndex } from '../../features/catalog/logic/buildData';

export async function getStaticPaths() {
  const items = await getCatalogIndex();           // DTOs del índice
  return items
    .filter((a) => a.type === 'movie')
    .map((a) => ({ params: { id: a.id }, props: { audiovisual: a } }));
}
const { audiovisual } = Astro.props;               // viaja como DTO plano
---
<Layout>
  <MovieDetail audiovisual={audiovisual} client:visible />
</Layout>
```

La estructura de URLs concreta (`/p/[id]`, `/s/[id]/[season]/...`) vive en `dahem_urls.md`. `pages/` la implementa; los slices no saben de rutas.

---

## 6. Inversión de control sin contenedor

### 6.1. Servicios como clases, dependencias por constructor

Los servicios de `logic/` son **clases** que reciben sus dependencias por constructor, no las crean ni las importan adentro. Su trabajo es **orquestar**: hablar con I/O (Dexie, API), hidratar DTOs a instancias de `domain/`, y delegar las reglas a esas instancias.

```typescript
// features/my-list/logic/ListService.ts
import type { Table } from 'dexie';
import { List } from '../domain/List';
import { ListItem, type ListItemDTO } from '../domain/ListItem';

export class ListService {
  // La tabla de Dexie entra por constructor; no se importa. Testeable con un fake.
  constructor(private readonly table: Table<ListItemDTO>) {}

  async add(item: ListItem): Promise<void> {
    await this.table.put(item.toJSON());          // se persiste el DTO plano (DEXIE_LIST_ITEM)
  }

  async remove(code: string): Promise<void> {
    await this.table.delete(code);                // code es la PK en Dexie
  }

  async load(): Promise<List> {
    const dtos = await this.table.toArray();
    const items = dtos.map(ListItem.fromJSON);    // hidratación en la frontera
    return new List(items);                        // la regla vive en List
  }
}
```

El servicio no suma GB ni precios: pide `list.totalGb()` / `list.totalPrice()`. Las reglas están en `domain/`; el servicio coordina I/O e hidratación. La entidad `List` se testea directa, sin Dexie; el servicio se testea pasando un fake de `table` al constructor.

El `SearchService` sigue el mismo patrón, pero su dependencia es el índice MiniSearch y el `fetch` del fallback API (modo `loading | local | api` del documento de stack §3):

```typescript
// features/search/logic/SearchService.ts
import type MiniSearch from 'minisearch';

export class SearchService {
  constructor(
    private readonly index: MiniSearch,
    private readonly fetchFn: typeof fetch,   // fallback a NestJS si el índice no cargó
  ) {}

  search(query: string) {
    return this.index.search(query, { fuzzy: 0.2, prefix: true });
  }
}
```

### 6.2. Composition root

Un único archivo construye las instancias reales y las exporta. Es el único lugar que conoce el grafo completo de dependencias — el rol de un contenedor IoC, a coste cero de bundle.

```typescript
// app/db.ts — definición de Dexie (solo "Mi lista" se persiste en cliente)
import Dexie, { type Table } from 'dexie';
import type { ListItemDTO } from '../features/my-list/domain/ListItem';

export class DahemDB extends Dexie {
  listItems!: Table<ListItemDTO>;
  constructor() {
    super('dahem');
    this.version(1).stores({ listItems: 'code' });   // code como PK (DEXIE_LIST_ITEM)
  }
}
export const db = new DahemDB();
```

```typescript
// app/container.ts
import { db } from './db';
import { ListService } from '../features/my-list/logic/ListService';
import { SubmissionService } from '../features/submission/logic/SubmissionService';

export const listService = new ListService(db.listItems);
export const submissionService = new SubmissionService(listService);
// SearchService se cablea aparte, tras cargar el índice (es asíncrono).
```

Las islas importan desde aquí y nunca saben cómo se construyó la dependencia:

```typescript
// features/my-list/ui/Drawer.tsx
import { listService } from '../../../app/container';
```

Si mañana Dexie se reemplaza por otra cosa, se toca `app/container.ts` y `app/db.ts`, nada más.

---

## 7. Por qué no un contenedor IoC

- El grafo de dependencias de Dahem es pequeño (un puñado de servicios). El cableado manual es más legible, no menos.
- Los contenedores serios (InversifyJS, tsyringe) dependen de decoradores + `reflect-metadata`, que pesa y complica el build. Contradice el presupuesto de <100KB de JS (entorno Cuba).
- Awilix es para Node, no para el bundle del navegador.
- Si algún día `container.ts` se vuelve inmanejable por tamaño, ahí se reconsidera. Mientras tanto, un contenedor sería complejidad sin pagador.

(El backend NestJS es otra historia: ya trae su propio DI por decoradores y ahí sí se usa. Ver `dahem_backend.md`. El panel admin es React + Vite, stack aparte; ver su documento técnico.)

---

## 8. Testing de esta arquitectura

- **`domain/`** → tests unitarios puros con Vitest. Son los más fáciles y valiosos: instanciar la clase, llamar al método, verificar. Sin fakes, sin I/O. `new Audiovisual(1122, 'series', ...).code() === 'S1122'`, o `new List(items).fitsIn(8) === false`.
- **`logic/`** → tests unitarios con Vitest, pasando fakes por constructor. Verifican la orquestación (¿hidrata bien?, ¿persiste el DTO?), no las reglas (esas ya están cubiertas en `domain/`). `new ListService(fakeTable)`.
- **`store.ts`** → tests de estado con Vitest si la lógica de transición lo amerita.
- **`ui/`** → tests de componente solo donde aporte; el grueso de la confianza viene de `domain/` + `logic/` + E2E.
- **Flujos completos** → Playwright contra el build estático.

Poner las reglas en clases de dominio sin I/O es lo que hace que el grueso de los tests no necesite mocks: se prueba la entidad directa. La inyección por constructor cubre el resto en `logic/`: se instancia el servicio con un fake y listo.

---

## 9. Resumen operativo

- La raíz `features/` grita el negocio (`catalog`, `search`, `my-list`, `submission`, `account`).
- Cada feature es un slice vertical con `domain/ ui/ logic/ store.ts types.ts`.
- El negocio se modela como **clases de dominio** con sus reglas adentro (`Audiovisual`, `EpisodicContainer`, `List`...). `logic/` orquesta con **clases de servicio** (`ListService`, `SearchService`) que reciben dependencias por constructor; `domain/` decide.
- **Hidratar en la frontera:** JSON↔instancia con `fromJSON`/`toJSON` al cruzar SSG, Dexie o API. Stores y props guardan DTOs planos (los DTOs son los del modelo de datos §5).
- Dependencias apuntan hacia adentro; el dominio no conoce I/O ni Preact.
- Slices no se importan en profundidad entre sí; lo común sube a `shared/`.
- `pages/` es routing delgado que solo importa de slices.
- El cableado vive en `app/container.ts`. Sin contenedor IoC.