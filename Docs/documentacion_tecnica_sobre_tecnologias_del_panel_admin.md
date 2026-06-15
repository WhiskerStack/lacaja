# Daher — Stack técnico del panel admin

> Documento técnico. Tecnologías del panel de administración. Es una aplicación **separada** del catálogo público (landing).
> Complementa a `documentacion_no_tecnica_del_panel_admin.md` (funcional) y `daher_backend.md`.

**Última actualización:** 2026-06-02

---

## 0. Por qué un stack distinto al del landing (importante)

El landing público y el panel admin tienen **restricciones opuestas**, así que usan stacks distintos a propósito. Esto NO contradice las decisiones del landing; las respeta.

| | Landing público | Panel admin |
|---|---|---|
| Usuarios | Público general en Cuba, redes lentas | 2-3 operadores internos |
| Acceso | Abierto, sin login | Detrás de login |
| Rendering | SSG (Astro) | SPA (Vite) |
| Restricción dura | <100KB JS, peso mínimo | Ninguna de peso; prima velocidad de desarrollo |
| UI | Preact + daisyUI (sin Radix, por peso) | React + shadcn/ui (con Radix) |

En el landing se rechazó shadcn/Radix porque su peso de JS castigaba a usuarios con redes lentas. En el admin **esa restricción no existe**: lo abren pocas personas, internamente, sin la presión de banda de Cuba. Ahí shadcn/ui es la elección correcta — UI accesible y completa, montada en horas en vez de semanas. Reconstruir esto con daisyUI a mano sería más trabajo para peor resultado.

> Regla mental: dos apps, dos contextos, dos stacks. Coherente, no contradictorio.

---

## 1. Base: plantilla shadcn-admin

El panel parte de la plantilla open-source **satnaing/shadcn-admin** (MIT), no se construye desde cero.

- Repo: `https://github.com/satnaing/shadcn-admin`
- Demo: `https://shadcn-admin.netlify.app/`
- Licencia: MIT (uso y modificación libres).

Trae ya resueltos: light/dark mode, responsive, accesibilidad, sidebar, búsqueda global (command palette), 10+ páginas de ejemplo, y soporte RTL. Se adopta como base y se recorta/adapta a las pantallas reales del admin (catálogo, envíos, solicitudes, tarifas, usuarios — ver documento funcional).

> Nota: el autor la describe como colección de UI, no como "starter" formal. En la práctica se clona, se quita lo que no aplica y se conectan las pantallas al backend NestJS.

---

## 2. Stack de la plantilla

| Tecnología | Rol | Estado | Notas |
|---|---|---|---|
| **React** | Framework UI | ✅ | A diferencia del landing (Preact). Aquí no hay presupuesto de peso que lo impida. |
| **shadcn/ui** (Tailwind + Radix) | Librería de componentes | ✅ | Componentes copiados al repo, no dependencia opaca. Radix da accesibilidad y comportamiento. |
| **Tailwind CSS** | Estilado | ✅ | Base de shadcn/ui. |
| **Vite** | Build tool / dev server | ✅ | SPA, no SSG. Build rápido, HMR. |
| **TanStack Router** | Routing | ✅ | Routing con tipado fuerte. Distinto del file-based routing de Astro en el landing. |
| **TypeScript** | Tipado | ✅ | Todo el proyecto. |
| **ESLint + Prettier** | Lint / formato | ✅ | Ya configurados en la plantilla. |
| **Lucide + Tabler Icons** | Iconos | ✅ | Lucide general; Tabler solo para marcas. |
| **Clerk** | Auth (viene en la plantilla) | ❌ Descartado | Se quita. Auth propia contra NestJS en su lugar (§3). |
| **Auth propia** (NestJS + `ADMIN_USER`) | Login y sesión del panel | ✅ | Usuario/contraseña, `password_hash` en `ADMIN_USER`, sesión por token. Sin dependencia SaaS. |
| **awilix** | Contenedor IoC | ✅ | Cablea servicios por constructor. Modo CLASSIC/PROXY, **sin** `reflect-metadata` (no añade peso de decoradores). Aquí sí —a diferencia del landing— porque no hay presupuesto de JS. Ver §3b y `daher_arquitectura_admin.md`. |

---

## 3. Autenticación: auth propia (Clerk descartado)

La plantilla trae **Clerk** (servicio gestionado de identidad). **Se descarta.** Para Daher choca con lo ya definido:

- El documento funcional del admin define auth **propia**: bootstrap del primer usuario, creación de usuarios desde dentro, rol único, contra la tabla `ADMIN_USER` del modelo de datos.
- Clerk es un servicio externo (depende de su nube, su pricing, conectividad). Para un panel interno de 2-3 personas en Cuba, sumar una dependencia SaaS de identidad es desproporcionado y añade un punto de fallo de red.

**Decisión:** se quita Clerk y se usa **auth propia contra el backend NestJS**:
- Login con usuario/contraseña.
- `password_hash` en `ADMIN_USER` (hash, nunca texto plano).
- Sesión por token emitido por NestJS.
- Bootstrap del primer usuario y alta de usuarios desde dentro, según el funcional.

La plantilla queda como **UI**; todo su flujo de auth (componentes de login de Clerk, provider, hooks) se elimina y se reescribe contra la API propia. Las pantallas de login/usuarios se rehacen con los componentes shadcn ya presentes.

> Trabajo concreto al implementar: desinstalar `@clerk/*`, quitar el `ClerkProvider` y los guards de ruta basados en Clerk, y sustituirlos por un guard propio que valide el token de NestJS.

---

## 3b. Inversión de control: awilix

El panel usa **awilix** como contenedor IoC para cablear sus servicios (api, lógica, auth) por constructor. Esto contrasta con el landing, que **no** usa contenedor.

Por qué aquí sí y en el landing no:
- El landing rechazó todo contenedor por el presupuesto de <100KB de JS. El admin **no tiene** ese presupuesto (SPA interna, 2-3 usuarios).
- awilix en modo CLASSIC/PROXY resuelve dependencias **sin** decoradores ni `reflect-metadata`, así que no arrastra el peso que se evitó en el landing ni complica el build de Vite.
- El grafo de servicios del admin es mayor (cada slice tiene api + service), y una SPA tiene un punto de arranque único donde registrar el contenedor.
- Es coherente con el backend NestJS, que ya usa DI por contenedor.

> **Advertencia de build.** El modo CLASSIC resuelve por **nombre de parámetro** del constructor, y la minificación de producción de Vite puede renombrarlos, rompiendo la resolución. Mitigaciones: usar modo PROXY (constructor por desestructuración), o configurar el minificador para preservar nombres de parámetros, o registrar con claves explícitas. Decidir al configurar el build. Detalle y ejemplos en `daher_arquitectura_admin.md` §6.

El detalle de estructura de carpetas, capas y registro del contenedor vive en `daher_arquitectura_admin.md`.

---

## 4. Conexión con el resto del sistema

El panel admin es solo el frontend de administración. Escribe y lee contra el backend ya definido:

- **Backend:** NestJS (ver `daher_backend.md`). El panel consume sus endpoints para CRUD de catálogo, envíos, solicitudes, tarifas y usuarios.
- **Publicar:** el botón "Publicar" del panel dispara `POST /admin/publish`, que regenera el SSG del landing.
- **Base de datos:** el panel no toca la BD directamente; todo pasa por la API de NestJS.

El panel **no comparte código de UI con el landing** (distinto framework). Lo que sí puede compartir es la definición de tipos/DTOs y, si se desea, las clases de dominio (TypeScript), publicadas como paquete común o copiadas. Eso se decide al implementar.

---

## 5. Resumen de decisiones

| Decisión | Elegido | Motivo |
|---|---|---|
| Stack base | Plantilla satnaing/shadcn-admin (MIT) | UI completa y accesible lista; no reinventar |
| Framework | React (no Preact) | Sin presupuesto de peso en panel interno |
| UI | shadcn/ui + Tailwind + Radix | Aquí sí: el peso de Radix no penaliza a 2-3 usuarios internos |
| Build | Vite (SPA) | No necesita SSG; el admin no es público ni indexable |
| Routing | TanStack Router | Viene en la plantilla; tipado fuerte |
| Auth | Auth propia contra NestJS (Clerk descartado) | Coherencia con `ADMIN_USER`; evitar dependencia SaaS |
| IoC | awilix (sin `reflect-metadata`) | Grafo de servicios mayor; sin presupuesto de peso; coherente con NestJS. En el landing se descartó por el bundle |

---

## 6. Decisiones abiertas

- **Compartir tipos/dominio** entre landing y admin: paquete común, copia, o nada (§4).
- **Hosting del panel:** la plantilla trae config de Netlify; decidir si el panel va ahí, en el mismo VPS que el landing, o aparte. (El landing es SSG en VPS propio; el panel es SPA y podría ir en cualquier static host.)

---

## 7. Documentos relacionados

- **Funcional del panel admin:** `documentacion_no_tecnica_del_panel_admin.md`.
- **Arquitectura del panel admin (slices, awilix, capas):** `daher_arquitectura_admin.md`.
- **Backend:** `daher_backend.md`.
- **Modelo de datos (`ADMIN_USER`):** `documentacion_del_dominio_y_el_modelo_de_datos.md`.
- **Stack del landing (contraste):** `resumen_tecnico_stack_daher.md`.