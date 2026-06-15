# Dahem — Convenciones de arquitectura del backend

> Cómo se organiza el código del backend (NestJS + Drizzle + Postgres). Estructura de carpetas, regla de dependencias, modularidad con el contenedor IoC propio de Nest, y los patrones **Repository** y **Criteria** para el acceso a datos.
> Complementa a `documentacion_tecnica_sobre_tecnologias_del_backend.md` (stack), `documentacion_no_tecnica_del_backend.md` (funcional) y `documentacion_del_dominio_y_el_modelo_de_datos.md` (entidades y DTOs).
> Convención de código: identificadores en inglés (igual que el modelo de datos: `Audiovisual`, `level`, `sizeGb`); texto explicativo en español.

**Última actualización:** 2026-06-10

---

## 0. En qué se diferencia del landing y del admin (leer primero)

El backend comparte la *filosofía* del landing y el admin (vertical slicing, screaming architecture, dominio en clases con sus reglas adentro) pero cambia las decisiones de infraestructura, porque su rol y sus restricciones son distintos (es la frontera de escritura y la fuente de verdad; ver `documentacion_no_tecnica_del_backend.md` §1–3).

| Tema | Landing | Admin | Backend (este documento) |
|---|---|---|---|
| Plataforma | Astro SSG + islas Preact | SPA React + Vite | NestJS (Node) |
| Operación dominante | **lectura** (catálogo) | **escritura** (CRUD) | **escritura** + generación del SSG |
| Frontera de serialización | build SSG | API HTTP (cliente) | **fila de BD ↔ dominio** (capa de persistencia) |
| Acceso a datos | índice JSON estático | TanStack Query → NestJS | **Repository + Criteria sobre Drizzle** (§5) |
| IoC | sin contenedor (cableado manual) | awilix | **contenedor propio de NestJS** (decoradores; §7) |

Las dos diferencias propias de este documento son: (1) el acceso a datos se modela con **Repository + Criteria** sobre Drizzle (§5), y (2) la inyección de dependencias la resuelve el **contenedor de NestJS** por decoradores, no un archivo manual ni awilix (§7).

---

## 1. Principios

Los mismos tres del landing/admin, con la variante de IoC que ya trae Nest:

1. **Screaming architecture.** La raíz de `src/` grita el negocio del backend (catalog, list, account, requests, submission, pricing, admin, publish), no `controllers/`, `services/` o `entities/` genéricas.
2. **Vertical slicing.** Cada dominio es un **módulo de Nest** autocontenido: su dominio, su lógica de aplicación, su persistencia y sus controladores viven juntos. Se trabaja una feature tocando un módulo, no saltando entre carpetas por capa.
3. **Inversión de control con el contenedor de Nest.** Las dependencias entran por constructor —igual que en el landing y el admin— pero el cableado lo resuelve el **contenedor de NestJS** mediante decoradores (`@Injectable`, `@Module`). El porqué en §7.

> Estos principios reemplazan cualquier organización por capas técnicas en la raíz (`controllers/`, `services/`, `repositories/`). Con vertical slicing las capas existen, pero **dentro** de cada módulo, no en la raíz.

---

## 2. Estructura de carpetas

Los módulos coinciden con los bounded contexts del modelo de datos (`documentacion_del_dominio_y_el_modelo_de_datos.md` §2) y con las responsabilidades funcionales (`documentacion_no_tecnica_del_backend.md` §3):

```
src/
  modules/                       ← la raíz grita el negocio
    catalog/                     ← audiovisuales y jerarquía episódica, géneros, reparto, trailers
      domain/                    ← Audiovisual, EpisodicContainer, Season, Episode
                                   + AudiovisualRepository (PORT: interface/abstract)
      application/               ← casos de uso (CatalogService); orquesta dominio + repos
      infrastructure/            ← DrizzleAudiovisualRepository (ADAPTER), *.schema.ts de Drizzle,
                                   field-maps (allowlist) del Criteria
      http/                      ← controllers + DTOs (class-validator); pasan la intención al servicio
      catalog.module.ts          ← módulo Nest: cablea port→adapter, registra controllers
    list/                        ← Mi lista persistida del usuario (List, ListItem)
      domain/ application/ infrastructure/ http/ list.module.ts
    account/                     ← USER del landing: registro, sesión ligera
      domain/ application/ infrastructure/ http/ account.module.ts
    requests/                    ← solicitudes de contenido no disponible (pending|available|notified)
      domain/ application/ infrastructure/ http/ requests.module.ts
    submission/                  ← envío de lista por web: snapshot congelado (WebSubmission, SubmissionItem)
      domain/ application/ infrastructure/ http/ submission.module.ts
    pricing/                     ← tarifas configurables (PriceRate: normal, premiere)
      domain/ application/ infrastructure/ http/ pricing.module.ts
    admin/                       ← ADMIN_USER: cuentas del panel, bootstrap del primero
      domain/ application/ infrastructure/ http/ admin.module.ts
    auth/                        ← login, emisión/verificación de JWT, guards
      application/               ← AuthService
      http/                      ← AuthController, guards, decoradores
      auth.module.ts
    publish/                     ← disparar la regeneración del SSG (POST /admin/publish), cron
      application/               ← PublishService (encola/ejecuta el build)
      http/
      publish.module.ts

  shared/                        ← sin dueño de dominio
    criteria/                    ← Criteria, Filter, Order (el patrón, §5.1); CriteriaToDrizzleTransformer;
                                   CollectionFilter (para tests, §8)
    database/                    ← DatabaseModule: instancia Drizzle + token de inyección del `db`
    config/                      ← @nestjs/config tipado (DATABASE_URL, JWT secret, …)
    http/                        ← filtros de excepción, interceptores, pipes globales

  app.module.ts                  ← módulo raíz: importa los módulos de dominio + transversales
  main.ts                        ← bootstrap (ValidationPipe global, Helmet, CORS, Pino)
```

Regla para decidir dónde va algo: **si pertenece a un dominio del negocio, va en su módulo.** Solo lo transversal sin dueño (el patrón Criteria, la conexión a la BD, config, helpers HTTP) va en `shared/`.

---

## 3. Las capas dentro del módulo

Cada módulo tiene las mismas cuatro capas internas. Son una variante de hexagonal/ports-and-adapters, y mapean a las capas del landing/admin así: `domain/` es el mismo `domain/`; `application/` es el `logic/` del landing; `infrastructure/` + `http/` cubren lo que en el admin eran `api/` y los controllers.

- **`domain/`** — clases de dominio (las entidades del negocio con sus reglas adentro) **y los puertos de repositorio** (interfaces/clases abstractas que declaran *qué* operaciones de persistencia existen, no *cómo*). `Audiovisual`, `Season`, `List`, `AudiovisualRepository`. Cero imports de Nest, de Drizzle, de HTTP. El dominio no sabe que existe una base de datos: solo declara el contrato (§4, §5.2).
- **`application/`** — clases de servicio / casos de uso. Orquestan: reciben un repositorio (por su **puerto**, no el adapter), construyen o reciben un `Criteria`, piden las reglas al dominio, y devuelven dominio. No contienen las reglas de la entidad —esas están en `domain/`— ni SQL —eso está en `infrastructure/`. Reciben sus dependencias por constructor (§7).
- **`infrastructure/`** — los **adapters**: la implementación Drizzle de cada puerto de repositorio, los esquemas de Drizzle (`*.schema.ts`) y los *field-maps* (allowlist) que el Criteria necesita (§5.3). Es la única capa que conoce Drizzle y el SQL. Hidrata filas a instancias de `domain/` y serializa al revés.
- **`http/`** — controllers de Nest y DTOs con `class-validator`. **Solo capa de transporte:** valida la entrada, la pasa como *params* a `application/` (no construye el `Criteria`; eso es del servicio, §5.4), y forma la respuesta. No tiene reglas de negocio ni SQL.

Flujo típico (listar catálogo con filtros del admin): el controller valida el DTO de query y lo pasa como *params* al servicio → `catalogService.search(params)` → **el servicio construye el `Criteria`** (defaults, orden, paginación) y pide `audiovisualRepository.match(criteria)` (el puerto) → el adapter Drizzle transforma el `Criteria` a una consulta parametrizada, ejecuta, e **hidrata** las filas a instancias `Audiovisual` → el servicio aplica/consulta reglas del dominio si hace falta y devuelve → el controller serializa a DTO. El controller no arma el `Criteria` (§5.4–5.5); las reglas viven en `domain/`; el SQL en `infrastructure/`; el servicio orquesta y es dueño de la consulta.

---

## 4. Clases de dominio

El negocio se modela como clases con comportamiento, **las mismas del landing y el admin** (idealmente el paquete de dominio compartido; ver §9), no como objetos de datos anémicos. Los campos siguen el modelo de datos (`documentacion_del_dominio_y_el_modelo_de_datos.md` §3–4).

```typescript
// modules/catalog/domain/Audiovisual.ts  (mismo negocio que landing/admin)
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

  /** Código corto del documento funcional: P0023 para película, S1122 para episódico. */
  code(): string {
    const letter = this.type === 'movie' ? 'P' : 'S';
    return `${letter}${String(this.id).padStart(4, '0')}`;
  }

  isEpisodic(): boolean {
    return this.type !== 'movie';
  }

  /** Validación de negocio (regla del dominio, no del DTO de entrada). */
  validate(): string[] {
    const errors: string[] = [];
    if (!this.name.trim()) errors.push('El nombre es obligatorio.');
    if (this.year < 1900) errors.push('Año inválido.');
    if (!this.isEpisodic() && this.sizeGb <= 0) errors.push('Una película necesita peso en GB.');
    return errors;
  }

  static fromRow(d: AudiovisualDTO): Audiovisual {
    return new Audiovisual(d.id, d.type, d.name, d.year, d.rating, d.sizeGb, d.isPremiere);
  }

  toRow(): AudiovisualDTO {
    return {
      id: this.id, type: this.type, name: this.name, year: this.year,
      rating: this.rating, sizeGb: this.sizeGb, isPremiere: this.isPremiere,
    };
  }
}
```

> **La frontera de serialización aquí es la base de datos.** En el landing el borde era el SSG; en el admin, la API HTTP. En el backend, el borde es la capa `infrastructure/`: Drizzle devuelve filas planas (objetos), no instancias. La regla de **hidratar en la frontera** es la misma — `fromRow` al leer de la BD, `toRow` al escribir — solo que el borde es el repositorio, no el build de Astro ni el `fetch`.

El snapshot congelado del envío por web (`WebSubmission` + `SubmissionItem`) y las reglas de totales de `List` viven igual en el dominio (modelo de datos §3.1, §4). El backend, además, es quien **hace cumplir** las reglas del negocio venga lo que venga del landing o del admin (funcional §5): una vía de contacto obligatoria, códigos coherentes, envíos congelados, tarifas configurables. Esas reglas son métodos del dominio, no validaciones sueltas en el controller.

### 4.1. Cuándo el conjunto es dominio y cuándo es array

Surge la duda recurrente: para un grupo de entidades (p.ej. varios audiovisuales) ¿conviene una clase colección de dominio —`Audiovisuals` con sus métodos— en lugar de un `Audiovisual[]` pelado? El patrón existe y tiene nombre (**First-Class Collections** / colección de dominio en DDD), pero **no se aplica de forma uniforme**. La regla:

> Envuelve la colección en una clase **solo cuando el conjunto, como unidad, tiene comportamiento o invariantes propios** que ningún elemento suelto captura. Si es un mero resultado de consulta, usa un array.

El criterio que decide no es "¿es una colección?" sino **"¿el conjunto tiene identidad, invariantes o reglas que el array no expresa?"**.

- **Sí es dominio (clase colección).** `List` ya lo es: envuelve `ListItem[]` y aporta `totalGb()`, `totalPrice()`, `fitsIn(spaceGb)` — reglas del conjunto, no del ítem. Pertenece a un usuario, tiene total e invariante de espacio. Lo mismo `WebSubmission` (snapshot con totales congelados) y `EpisodicContainer`, que suma sus `Season` con `totalSizeGb()`.
- **No es dominio (array).** El resultado de `audiovisualRepository.match(criteria)` es una **consulta**, no un agregado. Los métodos que tentaría poner en una clase `Audiovisuals` —`filterByGenre()`, `topPremieres()`, `paginate()`— son **exactamente la responsabilidad del patrón Criteria** (§5). Crear esa clase lleva a uno de dos males: **duplicar Criteria** (dos formas de filtrar que mantener) o un **wrapper anémico** (solo `getItems()`/`length`, ceremonia que obliga a envolver y desenvolver en la frontera).

En esta arquitectura el punto es nítido porque la responsabilidad de "operar sobre un conjunto / consultar" **ya tiene dueño**: Criteria + Repository (y `CollectionFilter` en memoria, §8). Una clase colección por entidad se solaparía con esa capa.

| Caso | ¿Clase colección? | Por qué |
|---|---|---|
| `List` (Mi lista) | ✅ Sí (ya es así) | Agregado con invariantes: total, `fitsIn` |
| `WebSubmission` | ✅ Sí | Snapshot con identidad y totales congelados |
| Hijos de un agregado (`Season.episodes`) | 🟡 A veces | Si hay regla cross-hijo, ponla en el **padre** (`EpisodicContainer`), no en una clase `Episodes` aparte |
| `Audiovisual[]` de un `match(criteria)` | ❌ No | Es resultado de consulta; Criteria ya es el dueño de filtrar/ordenar/paginar |

Dos heurísticas que resumen lo anterior: **agregado → clase colección; resultado de consulta → array.** Y al dudar entre una clase `Xs` separada y un método en la entidad padre, suele ganar el padre (menos clases, la regla queda junto al dato que la posee).

---

## 5. Acceso a datos: Repository + Criteria

Esta es la decisión central del backend. En vez de repositorios que acumulan un método por cada consulta (`findByCategory`, `findActiveByCategory`, `findTopSellingByCategory`…), se combinan dos patrones:

- **Repository** — el dominio declara un **puerto** (interface) con operaciones genéricas; la infraestructura provee el **adapter** Drizzle. El dominio y la aplicación no conocen Drizzle.
- **Criteria** — un objeto inmutable que describe *qué* buscar (filtros, orden, paginación), agnóstico de la base de datos. El repositorio recibe un `Criteria` y lo ejecuta. Un solo `match(criteria)` reemplaza la familia de `findByX`.

El patrón Criteria está desarrollado a fondo en el blog `https://david200197.github.io/david-portafolio/es//blogs/criteria_pattern`; aquí se resume y se fija **cómo se adopta en este backend**.

### 5.1. El núcleo Criteria (en `shared/criteria/`)

Es transversal a todos los módulos, así que vive en `shared/`. La clase `Criteria` es **inmutable** (una vez creada no cambia, evita bugs al pasarla a varios sitios) y compone con `Criteria.and(...)` / `Criteria.or(...)`.

```typescript
// shared/criteria/Criteria.ts (resumen — versión completa en el blog §1)
export type Operator = '=' | '!=' | '<' | '<=' | '>' | '>=' | 'IN' | 'LIKE';
export type LogicalOperator = 'AND' | 'OR';

export interface Filter { field: string; operator: Operator; value: any; }
export interface CompositeFilter { operator: LogicalOperator; filters: (Filter | CompositeFilter)[]; }
export type CriteriaFilter = Filter | CompositeFilter;
export interface Order { field: string; direction: 'ASC' | 'DESC'; }

export class Criteria {
  constructor(private readonly options: {
    filters?: CriteriaFilter[]; orders?: Order[]; limit?: number; offset?: number;
  } = {}) {}
  getFilters() { return this.options.filters ?? []; }
  getOrders() { return this.options.orders ?? []; }
  getLimit() { return this.options.limit; }
  getOffset() { return this.options.offset; }
  // static and(...), static or(...) — ver blog §1
}
```

Los **criterios especializados** encapsulan reglas de negocio reutilizables (blog §2). Viven en el `domain/` del módulo que les da sentido, porque expresan negocio:

```typescript
// modules/catalog/domain/PremieresCriteria.ts
import { Criteria } from '../../../shared/criteria/Criteria';

export class PremieresCriteria extends Criteria {
  constructor(params: { limit?: number; type?: string } = {}) {
    const filters = [{ field: 'isPremiere', operator: '=' as const, value: true }];
    if (params.type) filters.push({ field: 'type', operator: '=' as const, value: params.type });
    super({
      filters,
      orders: [{ field: 'year', direction: 'DESC' }],
      limit: params.limit ?? 20,
    });
  }
}
```

### 5.2. El puerto de repositorio (en `domain/`)

El puerto es una **clase abstracta** (no una `interface` TS): NestJS la usa como *token de inyección* en tiempo de ejecución (§7), cosa que una interface —que se borra al compilar— no permite. Declara operaciones genéricas basadas en `Criteria`, nunca `findByX`.

```typescript
// modules/catalog/domain/AudiovisualRepository.ts
import { Criteria } from '../../../shared/criteria/Criteria';
import { Audiovisual } from './Audiovisual';

export abstract class AudiovisualRepository {
  abstract match(criteria: Criteria): Promise<Audiovisual[]>;
  abstract count(criteria: Criteria): Promise<number>;
  abstract findById(id: number): Promise<Audiovisual | null>;
  abstract save(entity: Audiovisual): Promise<Audiovisual>;
  abstract delete(id: number): Promise<void>;
}
```

El dominio depende solo de esta abstracción. Cualquier servicio de `application/` la recibe por constructor y nunca sabe que detrás hay Drizzle.

### 5.3. El adapter Drizzle + el allowlist (en `infrastructure/`)

Aquí está la pieza que el blog marca como **la más importante en producción** (blog §6): el `Criteria` acepta `field: string` libre, y si se construye a partir de la petición HTTP —su caso de uso natural— el cliente decide qué campos consultar. Sin restricción, eso es **inyección por campo** y **sobreexposición de datos** (filtrar por `password_hash`, por ejemplo). La mitigación es un **allowlist tipado**: un mapa de nombre público → columna real de Drizzle. Lo que no está en el mapa no se puede filtrar ni ordenar, y la consulta falla de forma controlada.

```typescript
// modules/catalog/infrastructure/audiovisual.schema.ts
import { pgTable, serial, text, integer, real, boolean } from 'drizzle-orm/pg-core';

export const audiovisuals = pgTable('audiovisual', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(),
  name: text('name').notNull(),
  year: integer('year').notNull(),
  rating: real('rating').notNull(),
  sizeGb: real('size_gb').notNull(),
  isPremiere: boolean('is_premiere').notNull(),
  // … genre_id, region_id, language_id (FKs) — NO se exponen al allowlist por defecto
});
```

```typescript
// modules/catalog/infrastructure/DrizzleAudiovisualRepository.ts
import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { AudiovisualRepository } from '../domain/AudiovisualRepository';
import { Audiovisual } from '../domain/Audiovisual';
import { Criteria } from '../../../shared/criteria/Criteria';
import { CriteriaToDrizzleTransformer, FieldMap } from '../../../shared/criteria/CriteriaToDrizzleTransformer';
import { DRIZZLE } from '../../../shared/database/database.tokens';
import type { Database } from '../../../shared/database/database.types';
import { audiovisuals } from './audiovisual.schema';

// El allowlist se declara una sola vez, junto a la tabla. Solo estos campos
// son consultables desde el exterior, aunque la tabla tenga más columnas (FKs internas).
const AUDIOVISUAL_FIELDS: FieldMap = {
  id: audiovisuals.id,
  type: audiovisuals.type,
  name: audiovisuals.name,
  year: audiovisuals.year,
  rating: audiovisuals.rating,
  sizeGb: audiovisuals.sizeGb,
  isPremiere: audiovisuals.isPremiere,
};

@Injectable()
export class DrizzleAudiovisualRepository extends AudiovisualRepository {
  private readonly transformer = new CriteriaToDrizzleTransformer(AUDIOVISUAL_FIELDS);

  constructor(@Inject(DRIZZLE) private readonly db: Database) {
    super();
  }

  async match(criteria: Criteria): Promise<Audiovisual[]> {
    const { where, orderBy, limit, offset } = this.transformer.transform(criteria);
    let query = this.db.select().from(audiovisuals).$dynamic();
    if (where) query = query.where(where);
    if (orderBy.length) query = query.orderBy(...orderBy);
    if (limit !== undefined) query = query.limit(limit);
    if (offset !== undefined) query = query.offset(offset);
    const rows = await query;
    return rows.map(Audiovisual.fromRow);          // hidratar en la frontera (BD → dominio)
  }

  async count(criteria: Criteria): Promise<number> { /* COUNT(*) con el mismo where */ return 0; }

  async findById(id: number): Promise<Audiovisual | null> {
    const [row] = await this.db.select().from(audiovisuals).where(eq(audiovisuals.id, id)).limit(1);
    return row ? Audiovisual.fromRow(row) : null;
  }

  async save(entity: Audiovisual): Promise<Audiovisual> {
    const [row] = await this.db.insert(audiovisuals).values(entity.toRow())
      .onConflictDoUpdate({ target: audiovisuals.id, set: entity.toRow() }).returning();
    return Audiovisual.fromRow(row);
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(audiovisuals).where(eq(audiovisuals.id, id));
  }
}
```

El `CriteriaToDrizzleTransformer` (en `shared/criteria/`, código completo en el blog §6) hace tres cosas que justifican elegir Drizzle (ver `documentacion_tecnica_sobre_tecnologias_del_backend.md` §3):

- **Sin inyección por valor.** Drizzle parametriza: el `value` viaja como parámetro, nunca interpolado en texto.
- **Sin inyección ni sobreexposición por campo.** `resolveColumn(field)` rechaza cualquier nombre fuera del `FieldMap` antes de tocar la BD. Es el único punto de entrada de datos no confiables, explícito y auditable.
- **Tipado donde importa.** La tabla de operadores está tipada contra `Operator`; si se añade un operador al `Criteria` y se olvida implementarlo, el compilador avisa.

> **El borde que el tipado no cubre** (blog §6, final): el `field` del `Criteria` nace de la petición HTTP en runtime, así que TypeScript no puede garantizar en compilación que exista en el mapa. Por eso `resolveColumn` valida en runtime y lanza. Es inherente al patrón, no una carencia de Drizzle. Concentrar ahí toda la desconfianza es justo lo que se quiere.

### 5.4. El servicio de aplicación: dueño del Criteria

**El `Criteria` lo construye el servicio, no el controller.** El `Criteria` es una abstracción de la capa de aplicación/dominio (vive en `shared/criteria/`, lo consume el puerto), **no** un concepto HTTP. Por eso la política de consulta —defaults, orden por defecto, paginación, filtros obligatorios de scoping, y la posibilidad de lanzar **varias** consultas— pertenece al servicio. El controller solo entrega una *intención* validada y agnóstica del transporte (§5.5).

Esto también respeta el reúso: el controller HTTP es **una** de varias puertas de entrada (el cron de `publish`, una llamada interna desde otro módulo, un consumidor de cola). Si el ensamblado del `Criteria` viviera en el controller, no se podría reutilizar; en el servicio, sí.

```typescript
// modules/catalog/application/SearchCatalogParams.ts — intención plana, agnóstica del transporte
export interface SearchCatalogParams {
  type?: string;
  name?: string;
  page?: number;
  pageSize?: number;
}
```

```typescript
// modules/catalog/application/CatalogService.ts
import { Injectable } from '@nestjs/common';
import { AudiovisualRepository } from '../domain/AudiovisualRepository';
import { Audiovisual } from '../domain/Audiovisual';
import { Criteria } from '../../../shared/criteria/Criteria';
import { PremieresCriteria } from '../domain/PremieresCriteria';
import { SearchCatalogParams } from './SearchCatalogParams';

@Injectable()
export class CatalogService {
  constructor(private readonly repo: AudiovisualRepository) {}   // el PUERTO, no el adapter

  /** Filtrado genérico: el servicio traduce params → Criteria y aplica la política de negocio. */
  async search(params: SearchCatalogParams): Promise<Audiovisual[]> {
    const filters = [];
    if (params.type) filters.push({ field: 'type', operator: '=' as const, value: params.type });
    if (params.name) filters.push({ field: 'name', operator: 'LIKE' as const, value: params.name });

    const pageSize = params.pageSize ?? 50;
    const criteria = new Criteria({
      filters,
      orders: [{ field: 'year', direction: 'DESC' }],          // orden por defecto: decisión de negocio
      limit: pageSize,
      offset: ((params.page ?? 1) - 1) * pageSize,             // paginación: en el servicio, no en el controller
    });
    return this.repo.match(criteria);
  }

  /** Caso con varias consultas: el servicio manda; un único Criteria desde fuera no alcanzaría. */
  async homeData(): Promise<{ premieres: Audiovisual[]; total: number }> {
    const premieres = await this.repo.match(new PremieresCriteria({ limit: 10 })); // criterio de dominio
    const total = await this.repo.count(new Criteria());
    return { premieres, total };
  }

  async create(entity: Audiovisual): Promise<Audiovisual> {
    const errors = entity.validate();              // la regla vive en el dominio
    if (errors.length) throw new Error(errors.join(' '));
    return this.repo.save(entity);
  }
}
```

Dos estilos de construir el `Criteria`, ambos en el servicio:
- **Consultas con significado de negocio** (estrenos del home, "top X") → **clases Criteria especializadas** en `domain/` (`PremieresCriteria`), instanciadas por el servicio. El controller nunca instancia una subclase que codifica reglas.
- **Filtrado genérico/ad-hoc** (búsqueda del admin) → el servicio arma un `Criteria` genérico a partir de los params, aplicando defaults y scoping.

### 5.5. Del HTTP a la intención (en `http/`)

El controller queda **delgado**: valida el query con `class-validator`, lo pasa como params al servicio y forma la respuesta. No construye el `Criteria` ni decide defaults/orden/paginación.

```typescript
// modules/catalog/http/SearchCatalogDto.ts
import { IsOptional, IsInt, IsString, Min } from 'class-validator';

export class SearchCatalogDto {
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsInt() @Min(1) page?: number;
  @IsOptional() @IsInt() @Min(1) pageSize?: number;
}
```

```typescript
// modules/catalog/http/CatalogController.ts
import { Controller, Get, Query } from '@nestjs/common';
import { CatalogService } from '../application/CatalogService';
import { SearchCatalogDto } from './SearchCatalogDto';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly service: CatalogService) {}

  @Get()
  async search(@Query() q: SearchCatalogDto) {
    const result = await this.service.search(q);     // pasa la intención validada, NO un Criteria
    return result.map((a) => ({ ...a.toRow(), code: a.code() }));   // dominio → DTO de respuesta
  }
}
```

> **Por qué el servicio y no el controller.** El controller es transporte; armar el `Criteria` ahí mete política de consulta (qué campo filtra, defaults, orden, paginación, scoping) en la capa equivocada, y deja la consulta sin reutilizar para otras entradas (cron, llamadas internas). La excepción tolerable es un endpoint de **paso directo sin ninguna regla**: ahí armar el `Criteria` en el controller es pragmático. En cuanto aparece lógica de negocio o más de una consulta, sube al servicio. Ante la duda, default al servicio.
>
> Nota de acoplamiento: el servicio recibe aquí el DTO HTTP directamente por simplicidad. La versión "pura" define `SearchCatalogParams` (interfaz plana en `application/`) y el controller mapea el DTO → params, para que la aplicación no dependa del transporte. Para la escala de Dahem, pasar el DTO validado es aceptable.
>
> **Seguridad:** dónde se construya el `Criteria` no cambia la mitigación de inyección/sobreexposición — esa vive en `resolveColumn` del transformer (el allowlist, §5.3) y protege venga el `field` de donde venga. Esta decisión es de capas y reúso, no de seguridad.

---

## 6. Regla de dependencias

Las flechas de importación apuntan en una sola dirección. Romper esto es la única "deuda de arquitectura" que se vigila aquí.

```
http/ ──▶ application/ ──▶ domain/ ◀── infrastructure/
                  │            ▲              │
                  └────────────┘              ▼
                                          Drizzle / Postgres
```

- **`domain/`** es la capa más interna: clases de dominio, puertos de repositorio y criterios especializados. Importa solo de `shared/criteria/` y de otras clases de su `domain/`. **Nunca** importa `application/`, `infrastructure/`, `http/`, Nest, Drizzle ni nada de I/O. El dominio no sabe de dónde vienen sus datos.
- **`application/`** importa `domain/` (entidades y **puertos**) y `shared/`. **Nunca** importa `infrastructure/` ni `http/`. Depende de la abstracción `AudiovisualRepository`, no de `DrizzleAudiovisualRepository`.
- **`infrastructure/`** importa `domain/` (para implementar el puerto e hidratar), Drizzle y `shared/`. Es el único que conoce el SQL. No importa `http/` ni `application/`.
- **`http/`** importa `application/`, `domain/` (para tipos/mapeo) y `shared/`. No hace SQL ni contiene reglas de negocio.
- **`shared/`** no importa de ningún módulo de `modules/`.
- **Entre módulos:** un módulo no importa el `infrastructure/` ni el `domain/` interno de otro. Si dos módulos comparten una entidad, sube al paquete de dominio común (§9) o a `shared/`. Si un módulo necesita *coordinar* con otro, lo hace consumiendo el **servicio público** que el otro módulo exporta en su `*.module.ts`, no por imports profundos.

La inversión de dependencias (que `application/` dependa del puerto y el adapter Drizzle dependa también del puerto, no al revés) es lo que mantiene `infrastructure/` como un detalle reemplazable: cambiar Drizzle por otra cosa toca solo esa carpeta y el cableado del módulo (§7), nunca el dominio ni la aplicación.

Esto se puede vigilar con `eslint-plugin-boundaries` o las reglas de capa de Nest; por ahora es disciplina.

---

## 7. Inversión de control con el contenedor de NestJS

### 7.1. Por qué aquí el contenedor ya viene dado

En el landing se descartó todo contenedor IoC por el presupuesto de <100KB de JS; en el admin se eligió awilix porque su grafo lo justificaba. **En el backend no hay que elegir contenedor: NestJS ya es uno.** Trae DI por decoradores (`@Injectable`, `@Module`, `@Inject`) sobre `reflect-metadata`, y en un backend Node el peso de `reflect-metadata` no es un problema (no va a un bundle de navegador). Era, de hecho, la razón por la que el landing no podía usar este enfoque y el backend sí. El stack ya depende de esa metadata para SWC y Vitest (`documentacion_tecnica_sobre_tecnologias_del_backend.md` §5).

### 7.2. Dependencias por constructor, igual que landing/admin

El principio es idéntico: las dependencias entran por constructor, no se importan ni instancian dentro de la lógica. Lo que cambia es **quién inyecta** (el contenedor de Nest) y **cómo se ata el puerto a su adapter** (en el `*.module.ts`).

El truco del Repository en NestJS: el puerto es una **clase abstracta**, que sí existe en runtime y sirve de token. El módulo registra el adapter Drizzle *bajo el token del puerto*. Así `CatalogService` pide `AudiovisualRepository` en su constructor y Nest le entrega la implementación Drizzle, sin que el servicio lo sepa.

```typescript
// modules/catalog/catalog.module.ts
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { CatalogController } from './http/CatalogController';
import { CatalogService } from './application/CatalogService';
import { AudiovisualRepository } from './domain/AudiovisualRepository';
import { DrizzleAudiovisualRepository } from './infrastructure/DrizzleAudiovisualRepository';

@Module({
  imports: [DatabaseModule],                       // provee el token DRIZZLE (la instancia `db`)
  controllers: [CatalogController],
  providers: [
    CatalogService,
    // Ata el PUERTO a su ADAPTER: quien pida AudiovisualRepository recibe el de Drizzle.
    { provide: AudiovisualRepository, useClass: DrizzleAudiovisualRepository },
  ],
  exports: [CatalogService],                        // lo que otros módulos pueden consumir
})
export class CatalogModule {}
```

El `*.module.ts` es el **composition root por módulo**: el único lugar que conoce el cableado puerto→adapter de ese dominio. Equivale al `container.ts` del landing/admin, pero por módulo y resuelto por Nest. El `app.module.ts` solo importa los módulos.

### 7.3. La conexión a la BD como provider compartido

La instancia de Drizzle se crea una vez y se inyecta por un token, en un módulo de `shared/`:

```typescript
// shared/database/database.module.ts
import { Module, Global } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from './database.tokens';

@Global()
@Module({
  providers: [{
    provide: DRIZZLE,
    inject: [ConfigService],
    useFactory: (config: ConfigService) => {
      const pool = new Pool({ connectionString: config.get('DATABASE_URL') });  // una sola cadena
      return drizzle(pool);
    },
  }],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
```

Una sola `DATABASE_URL` (Postgres a secas, sin el pooler/doble-cadena de Supabase; ver stack §3).

---

## 8. Testing de esta arquitectura

La forma de la arquitectura está pensada para que el grueso de los tests no necesite base de datos ni mocks pesados:

- **`domain/`** → tests unitarios puros con Vitest, sin I/O. Los más valiosos y compartidos con landing/admin: `new Audiovisual(1122, 'series', …).code() === 'S1122'`, `audiovisual.validate()`, `new List(items).fitsIn(8)`.
- **Criterios especializados** → unitario verificando que producen los filtros/orden esperados (`new PremieresCriteria({ limit: 5 }).getFilters()`).
- **`application/`** → unitario pasando un repositorio fake por constructor. Aquí entra el **`CollectionFilter`** del blog (§4): implementa la misma API de `Criteria` sobre un array en memoria, así que un repositorio fake ejecuta criterios de verdad sin BD.

  ```typescript
  // test: CatalogService con repo en memoria
  import { CollectionFilter } from '../../shared/criteria/CollectionFilter';

  class FakeAudiovisualRepository extends AudiovisualRepository {
    private filter = new CollectionFilter(this.seed);
    constructor(private readonly seed: AudiovisualDTO[]) { super(); }
    async match(c: Criteria) { return this.filter.findAll(c).map(Audiovisual.fromRow); }
    // count/findById/save/delete sobre el array…
  }

  const service = new CatalogService(new FakeAudiovisualRepository([...]));
  ```

  El `CollectionFilter` aplica los mismos filtros, orden y paginación que la BD, sobre datos planos. Sin mockear Drizzle, sin Postgres: los tests de orquestación corren en memoria y siguen ejercitando el patrón Criteria de verdad.
- **`infrastructure/`** → test de integración contra una Postgres real (Docker o BD de test; stack §5). Verifica que el `CriteriaToDrizzleTransformer` genera SQL correcto, que `resolveColumn` rechaza campos fuera del allowlist, y que la hidratación `fromRow` reconstruye bien.
- **`http/` / E2E** → levantar el módulo Nest contra Postgres real y probar endpoints de punta a punta (el `ValidationPipe`, el paso de params al servicio y la consulta resultante, los guards de auth).

Poner las reglas en clases de dominio sin I/O y el acceso a datos detrás de un puerto es lo que hace que casi todo se pruebe sin infraestructura: el dominio directo, la aplicación con `CollectionFilter`, y solo la capa Drizzle necesita Postgres.

---

## 9. Compartir dominio con landing y admin

El `domain/` del backend es **el mismo negocio** que el del landing y el admin (`Audiovisual` genera el mismo código, `List` calcula los mismos totales). La diferencia es la frontera de serialización (BD aquí, SSG en el landing, API en el admin) y que el backend, además, **valida y persiste**. Tres opciones, en orden de preferencia (misma decisión abierta que en los otros documentos):

1. **Paquete compartido** (`@dahem/domain`) consumido por los tres. Una sola fuente de verdad de las reglas. Recomendado si el monorepo lo permite. Los puertos de repositorio y los criterios *del lado servidor* pueden quedar fuera del paquete (son específicos del backend) o entrar como subpaquete.
2. **Copia sincronizada** de las clases. Simple pero divergente.
3. **Nada compartido.** Solo si los dominios empiezan a separarse de verdad.

El núcleo `Criteria`, en cambio, es backend-first (su valor está en el acceso a datos del servidor); si el admin quisiera construir criterios para llamar a la API, se podría extraer también a un paquete común, pero no es requisito.

---

## 10. Resumen operativo

- La raíz `modules/` grita el negocio del backend (`catalog`, `list`, `account`, `requests`, `submission`, `pricing`, `admin`, `auth`, `publish`).
- Cada módulo es un slice vertical con `domain/ application/ infrastructure/ http/ *.module.ts`.
- El negocio se modela como **clases de dominio** con sus reglas adentro, las mismas del landing/admin (idealmente paquete compartido).
- **Acceso a datos con Repository + Criteria:** el dominio declara un **puerto** (clase abstracta), la `infrastructure/` provee el adapter Drizzle. Un `match(criteria)` reemplaza la familia de `findByX`.
- **Criteria con allowlist obligatorio:** el `FieldMap` por tabla es la mitigación de inyección/sobreexposición por campo; sin él, los filtros dinámicos son una vulnerabilidad (blog §6).
- **El `Criteria` lo construye el servicio, no el controller:** el controller pasa una intención validada (params); el servicio es dueño de la política de consulta y puede lanzar varias (§5.4–5.5).
- **Hidratar en la frontera de la BD:** `fromRow` al leer, `toRow` al escribir, dentro de `infrastructure/`.
- Dependencias por constructor, cableadas por el **contenedor de NestJS**; el puerto se ata a su adapter en el `*.module.ts` (composition root por módulo).
- Una sola `DATABASE_URL` a Postgres (sin Supabase ni pooler/doble-cadena; stack §3).
- Tests: dominio puro y aplicación con `CollectionFilter` corren sin BD; solo `infrastructure/` y E2E tocan Postgres.

---

## 11. Documentos relacionados

- **Backend (stack técnico):** `documentacion_tecnica_sobre_tecnologias_del_backend.md`.
- **Backend (funcional):** `documentacion_no_tecnica_del_backend.md`.
- **Modelo de datos:** `documentacion_del_dominio_y_el_modelo_de_datos.md`.
- **Arquitectura del landing:** `documentacion_tecnica_sobre_arquitectura_del_landing.md`.
- **Arquitectura del panel admin:** `documentacion_tecnica_sobre_arquitectura_del_panel_admin.md`.
- **Patrón Criteria (blog):** `blog/criteria_pattern.es.md`.
