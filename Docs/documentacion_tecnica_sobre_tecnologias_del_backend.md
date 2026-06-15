# Daher — Stack técnico del backend

> Documento técnico. Tecnologías del backend. Es el servicio que da soporte tanto al landing como al panel admin.
> Complementa a `documentacion_no_tecnica_del_backend.md` (funcional), `daher_backend.md` y `documentacion_del_dominio_y_el_modelo_de_datos.md`.

**Última actualización:** 2026-06-10

---

## 0. Rol del backend en el sistema

El backend es la frontera de **escritura** y el generador del SSG. No sirve la web pública (eso lo hace el servidor estático del VPS); expone una API que consumen el landing (cuentas, envíos por web, solicitudes, búsqueda fallback) y el panel admin (todo el CRUD), y dispara la regeneración del sitio al publicar. Es la fuente de verdad del catálogo.

---

## 1. Stack confirmado

| Tecnología | Rol | Estado | Notas |
|---|---|---|---|
| **NestJS** | Framework de la API | ✅ | Estructura modular, DI por contenedor propio (decoradores). Ya era el backend del proyecto. |
| **Drizzle** | ORM / query builder | ✅ | Acceso tipado a Postgres, SQL explícito. Encaja con el patrón Criteria del dominio. Ver §3. |
| **Postgres** | Base de datos | ✅ | Postgres a secas (sin BaaS). Ver §3 sobre por qué no Supabase. |
| **Vitest** | Pruebas unitarias e integración | ✅ | Vía `unplugin-swc` para compatibilidad con decoradores de Nest. Ver §5. |
| **SWC** | Compilación / arranque | ✅ | `nest start -b swc`, ~20× más rápido que tsc. Mismo SWC alimenta Vitest. Ver §5. |

---

## 2. Tecnologías que faltaban (decisiones tomadas)

El stack que diste cubre framework, ORM, BD, tests y compilación. Pero un backend necesita cuatro piezas más que no estaban; aquí van con su decisión y alternativa.

| Necesidad | Elegido | Alternativa | Estado |
|---|---|---|---|
| Validación de entrada | **class-validator + class-transformer** | Zod | ✅ (ver §4) |
| Autenticación | **@nestjs/jwt** (JWT) | Passport + estrategia JWT | ✅ (ver §6) |
| Hash de contraseñas | **argon2** | bcrypt | ✅ (ver §6) |
| Configuración tipada | **@nestjs/config** | `dotenv` directo | ✅ (ver §8) |
| Cabeceras de seguridad + CORS | **Helmet + CORS acotado** | sin Helmet / CORS abierto | ✅ (ver §8) |
| Rate limiting (auth) | **@nestjs/throttler** | sin throttling | ✅ (ver §8) |
| Logging estructurado | **Pino (`nestjs-pino`)** | logger por defecto de Nest | ✅ (ver §8) |
| Cola para regenerar el SSG | **BullMQ + Redis** | regeneración síncrona sin cola | 🟡 abierto (ver §7) |

Ninguna es opcional salvo la cola (§7). Validación y auth son obligatorias en cualquier backend con escritura y login.

---

## 3. Drizzle + Postgres: por qué esta combinación

El stack original contemplaba Prisma sobre Supabase. La decisión se cambió a **Drizzle sobre Postgres a secas** por dos razones de fondo.

**Razón 1 — el patrón Criteria.** El dominio se va a construir sobre el **patrón Criteria** (filtros, orden y paginación expresados como objetos de dominio que se traducen a consultas, en vez de queries ad-hoc dispersas por los servicios). Esto se detalla en el **documento de arquitectura del backend**. Drizzle encaja mucho mejor con ese patrón que Prisma: expone un query builder de SQL explícito y componible, lo que permite traducir un objeto Criteria a una consulta de forma directa y tipada. Prisma, con su API de alto nivel y su cliente generado, esconde el SQL y hace más forzado construir consultas dinámicas a partir de criterios.

**Razón 2 — Supabase sobra teniendo backend.** Supabase es un BaaS: su valor está en Auth, Storage, APIs autogeneradas y reglas en la propia BD, pensado para apps sin backend o con backend mínimo. Aquí ya hay un backend completo en NestJS que se encarga de auth (§6), validación (§4) y toda la lógica. En ese escenario Supabase aporta una capa de gestión y de conceptos (pooler en modo transacción, doble cadena de conexión para migrar, servicios que no se usan) que **agrega complejidad innecesaria**. Un Postgres normal — gestionado por el proveedor que sea, o en el propio VPS — cumple lo único que de verdad se necesita: ser la base de datos.

**Qué implica en la práctica.**
- **Una sola cadena de conexión** (`DATABASE_URL`) hacia Postgres. Sin el problema de Supabase de tener que separar conexión *pooled* (runtime) y *directa* (migraciones): con Postgres a secas la CLI de migraciones y el runtime usan la misma BD sin tropiezos de pooler.
- **Migraciones con `drizzle-kit`:** el esquema se define en TypeScript (tablas de Drizzle) y `drizzle-kit generate` produce los SQL de migración; `drizzle-kit migrate` (o aplicarlas en CI, §8) las ejecuta. El esquema tipado alimenta directamente las consultas, sin paso de generación de cliente.
- **Nada de BaaS:** sin Supabase Auth, Storage ni APIs autogeneradas. La auth es propia (§6), el ORM/query builder es Drizzle, y la lógica vive en NestJS. Si en el futuro se necesita almacenamiento de imágenes, se decide aparte (§10) sin atarlo a un proveedor concreto.

---

## 4. Validación: class-validator + class-transformer

NestJS no valida la entrada por sí solo. Toda data que entra por la API (registro de cuenta, envío de lista, CRUD del catálogo desde el admin) debe validarse antes de tocar el dominio o la BD.

**Elegido: class-validator + class-transformer.** Es el camino "oficial" de NestJS: DTOs como clases con decoradores (`@IsString()`, `@IsEmail()`, `@MinLength()`, etc.) y validación automática mediante el `ValidationPipe` global de Nest. `class-transformer` se encarga de convertir el payload entrante en instancias de la clase DTO antes de validarlas. Encaja con el estilo idiomático del framework y mantiene la coherencia con la DI y los decoradores ya usados en controladores y servicios.

**Alternativa: Zod.** Esquemas explícitos, sin decoradores, y una sola definición sirve para validar **y** derivar el tipo TypeScript (`z.infer`). Es atractivo cuando se quiere evitar metadata de decoradores o compartir esquemas entre cliente y servidor. Se integra en Nest con un pipe propio o `nestjs-zod`. La razón de no elegirlo aquí: el backend ya gira en torno a decoradores (Nest, su DI y sus controladores), así que sumar class-validator no introduce un paradigma nuevo. Nota: Drizzle no es decorator-based (el esquema se define en TypeScript plano), así que el argumento se apoya en Nest, no en el ORM.

> class-validator funciona con SWC vía `unplugin-swc` (§5) siempre que el `.swcrc` tenga `decoratorMetadata: true` — el mismo flag que ya necesita Nest para la DI, así que no añade configuración extra.

---

## 5. SWC + Vitest: por qué van juntos

**SWC para arranque y build.** `nest start -b swc` compila con SWC en vez de tsc, ~20× más rápido. Se configura con un `.swcrc` que debe tener `jsc.parser.decorators: true` y `jsc.transform.legacyDecorator` + `decoratorMetadata: true`, porque NestJS depende de la metadata de decoradores para su inyección de dependencias.

**Vitest para tests, pero con un puente.** Vitest usa esbuild por defecto, y esbuild **no emite metadata de decoradores** — justo lo que Nest necesita. Sin arreglo, los tests que tocan DI fallan. La solución es el plugin **`unplugin-swc`**: hace que Vitest compile con SWC (no esbuild) y herede la config de decoradores del `tsconfig.json`/`.swcrc`. Es el mismo SWC del arranque, reutilizado en tests.

`vitest.config.ts` mínimo:

```typescript
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { globals: true, root: './' },
  plugins: [swc.vite()],   // compila con SWC: habilita emitDecoratorMetadata
});
```

Detalles a cuidar: Vitest no resuelve los path aliases de TS solos (hay que declararlos en `resolve.alias`), y los imports de `supertest` en tests E2E cambian de `import * as request` a `import request`.

Niveles de test:
- **Unitarios** → servicios y lógica de dominio con dependencias falsas (la DI de Nest facilita inyectar mocks).
- **Integración / E2E** → levantar el módulo Nest contra una Postgres real (un Postgres en Docker, o una BD de test del proveedor) y probar endpoints de punta a punta.

---

## 6. Autenticación: JWT + argon2

El modelo de datos ya define `ADMIN_USER` con `password_hash` y los documentos funcionales piden sesión por token. Las piezas concretas:

- **`@nestjs/jwt`** para emitir y verificar **JWT**. Al hacer login, el backend valida credenciales y devuelve un token; el panel admin lo guarda y lo manda en cada request. Un guard de Nest valida el token en las rutas protegidas.
- **argon2** para hashear contraseñas. Se elige sobre bcrypt porque argon2 (ganador del Password Hashing Competition) es hoy la recomendación para contraseñas nuevas: mejor resistencia a ataques con hardware especializado. bcrypt sigue siendo aceptable y más veterano; argon2 es la opción preferible para un proyecto nuevo.

**Dos públicos de auth distintos, no confundir:**
- **Admin** (`ADMIN_USER`): login con usuario/contraseña, bootstrap del primer usuario, alta desde dentro, rol único. Es el que protege el panel.
- **Cliente** (`USER` del landing): cuenta ligera (nombre + email/teléfono) solo para enviar la lista por web. Su "sesión" puede ser más liviana, pero usa el mismo mecanismo JWT.

> Passport (`@nestjs/passport` + `passport-jwt`) es la alternativa más convencional en Nest y añade estrategias listas. Para dos flujos simples, `@nestjs/jwt` directo basta y es menos maquinaria; si crecen los proveedores de identidad, Passport se justifica.

---

## 7. Cola para regenerar el SSG: BullMQ + Redis (abierto)

Cuando el admin pulsa Publicar (o en el cron de madrugada), el backend regenera el SSG del landing. Esa regeneración es **lenta** (build de Astro) y no debe bloquear la request del admin ni correr dos veces en paralelo. La solución natural es una **cola de trabajos**: el `POST /admin/publish` encola el build y responde de inmediato; un worker lo procesa.

- **Elegido: BullMQ**, ya mencionado en el stack del landing. Es el estándar de colas en Node/Nest, con integración oficial (`@nestjs/bullmq`).
- **Dependencia: Redis.** BullMQ **requiere Redis**, y aquí está el punto abierto: el Postgres elegido no incluye Redis. Hay que decidir de dónde sale:
  1. Redis en el **mismo VPS** que sirve el landing (simple, una pieza más que mantener).
  2. **Redis gestionado** (Upstash, Redis Cloud) — menos mantenimiento, dependencia externa y posible costo.
  3. **Sin cola:** si los builds son poco frecuentes y los dispara una sola persona, quizá baste con regeneración síncrona protegida por un lock simple, sin Redis. Más pobre pero sin infraestructura extra.

> Decisión pendiente. Para el MVP, la opción 3 (sin cola, con lock) puede ser suficiente y evita montar Redis; BullMQ entra cuando el volumen o la concurrencia lo justifiquen. Conviene decidir antes de implementar Publicar.

---

## 8. Piezas transversales (decididas)

Estas no son frameworks ni piezas de dominio, pero entran en el stack desde el día uno porque atacan riesgos reales (config sin tipar, cabeceras abiertas, abuso en login, logs ilegibles).

| Pieza | Para qué | Nota |
|---|---|---|
| **@nestjs/config** | Variables de entorno tipadas (la `DATABASE_URL` de Postgres, secreto JWT, etc.) | Estándar de Nest; carga `.env` y expone un `ConfigService` tipado. |
| **Helmet + CORS** | Cabeceras de seguridad HTTP y permitir solo a landing/admin llamar la API | Helmet con defaults; CORS acotado a los dominios reales de landing y admin (no `*`). |
| **Rate limiting** (`@nestjs/throttler`) | Limitar abuso en login, registro y otros endpoints públicos sensibles | Aplicado especialmente a endpoints de auth; valores afinables por ruta. |
| **Pino** (`nestjs-pino`) | Logging estructurado (JSON) | Útil para diagnosticar el flujo de publicación y para enviar logs a herramientas externas más adelante. |

Pendiente operativo, no tecnológico:

| Pieza | Para qué | Nota |
|---|---|---|
| **Migraciones en CI** | Aplicar migraciones Drizzle (`drizzle-kit migrate`) al desplegar | Definir en el pipeline (ver doc de CI/CD del landing, mismo criterio). |

---

## 9. Resumen de decisiones

| Decisión | Elegido | Motivo |
|---|---|---|
| Framework | NestJS | Modular, DI, ya era el backend |
| ORM | Drizzle | SQL explícito y tipado; encaja con el patrón Criteria (ver arquitectura del backend) |
| BD | Postgres (sin BaaS) | Lo único necesario es la BD; Supabase sobra teniendo backend y añade complejidad |
| Validación | class-validator + class-transformer | Estilo idiomático de Nest; integración nativa con `ValidationPipe` |
| Auth | @nestjs/jwt + argon2 | Token simple; argon2 preferible a bcrypt en proyectos nuevos |
| Tests | Vitest + unplugin-swc | Velocidad; el plugin resuelve la metadata de decoradores |
| Compilación | SWC | ~20× sobre tsc; mismo SWC en arranque y tests |
| Configuración | @nestjs/config | Variables de entorno tipadas (`DATABASE_URL` de Postgres, secreto JWT) |
| Seguridad HTTP | Helmet + CORS acotado | Cabeceras seguras y API accesible solo desde landing/admin |
| Rate limiting | @nestjs/throttler | Frenar abuso en login y registro |
| Logging | Pino (`nestjs-pino`) | Logs estructurados, útiles para el flujo de publicación |
| Cola de builds | BullMQ + Redis | 🟡 abierto: de dónde sale Redis, o si el MVP va sin cola |

---

## 10. Decisiones abiertas

- **Redis para BullMQ** (§7): VPS, gestionado, o MVP sin cola.
- **Validación**: confirmar class-validator como elección por defecto, o reconsiderar Zod si se quiere compartir esquemas entre cliente y servidor (§4).
- **Storage de imágenes**: si se monta un object storage (S3-compatible u otro) o se mantiene el procesamiento en build del landing (hoy el landing optimiza imágenes en build con Sharp; el backend solo guardaría la URL origen).
- **Compartir dominio/DTOs** con landing y admin: paquete común vs copia (misma decisión abierta que en los otros documentos).

---

## 11. Documentos relacionados

- **Backend (funcional):** `documentacion_no_tecnica_del_backend.md`.
- **Arquitectura del backend:** `documentacion_tecnica_sobre_arquitectura_del_backend.md` (Repository + Criteria, patrón Criteria explicado en detalle).
- **Modelo de datos:** `documentacion_del_dominio_y_el_modelo_de_datos.md`.
- **Stack del landing:** `resumen_tecnico_stack_daher.md`.
- **Stack del panel admin:** `documentacion_tecnica_panel_admin.md`.