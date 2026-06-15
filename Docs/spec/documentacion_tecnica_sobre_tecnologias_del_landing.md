# Dahem — Resumen técnico del stack

> Inventario vivo de las tecnologías del proyecto. Fuente: `guia_tecnica_de_frontend_I.md` y `documentacion_no_tecnica_de_la_landing_page.md`.
> Mantener este archivo al día: cada vez que se confirme, descarte o agregue una tecnología, actualizar la tabla correspondiente y la fecha de abajo.

**Última actualización:** 2026-06-01

---

## Cómo leer este documento

Cada tecnología tiene un **estado** que indica cuán firme es la decisión:

| Estado | Significado |
|---|---|
| ✅ **Confirmado** | Decisión tomada y justificada en los documentos. Se construye con esto. |
| 🔵 **Preferido** | Hay una opción preferida pero la decisión final no está cerrada. |
| 🟡 **Abierto** | Punto de decisión pendiente. Hay candidatos, falta elegir. |
| 🟣 **Futuro** | No se usa al inicio; previsto para cuando crezca el tráfico o las necesidades. |
| ⚪ **Fuera de alcance** | Mencionado como necesario pero no cubierto aún por ningún documento. |

La columna **Fase** referencia el orden de implementación de la guía técnica (§10): F1 = MVP, F2 = backend+auth, F3 = offline+PWA, F4 = optimizaciones.

---

## 1. Núcleo de rendering

| Tecnología | Rol | Estado | Fase | Notas |
|---|---|---|---|---|
| **Astro (SSG puro)** | Generación estática de todas las páginas del catálogo | ✅ | F1 | Sin SSR ni serverless de Astro. Lectura siempre desde SSG. |
| **Preact** (`@astrojs/preact`) | Framework de islas interactivas | ✅ | F1 | Elegido sobre React/Svelte/Solid por peso (~3KB). **No mezclar** con otros frameworks de islas. |
| Astro components (`.astro`) | Componentes sin estado, cero JS en cliente | ✅ | F1 | Para todo lo que no necesite interactividad. |
| Next.js | — | ❌ Descartado | — | Descartado deliberadamente a favor de Astro. |
| SSR de Astro | — | ❌ Descartado | — | Descartado por riesgo de dependencia en runtime. |

---

## 2. Estado e interactividad

| Tecnología | Rol | Estado | Fase | Notas |
|---|---|---|---|---|
| **nanostores** + `@nanostores/preact` | Estado compartido entre islas | ✅ | F1 | Stores: "Mi lista", sesión, modo de búsqueda (`loading\|local\|api`). |

---

## 3. Búsqueda

| Tecnología | Rol | Estado | Fase | Notas |
|---|---|---|---|---|
| **MiniSearch** | Motor de búsqueda en cliente | ✅ | F1 | Elegido sobre FlexSearch por mejor manejo de acentos en español (`processTerm` + `normalize('NFD')`). Fuzzy + prefix. |
| Índice JSON pre-generado | Datos de búsqueda en build-time | ✅ | F1 (básico) / F4 (optimizado) | `search-index` (autocomplete) y `library-index` (filtros) separados. Hash en nombre, diccionarios + tuplas posicionales. |
| Búsqueda híbrida 3 estados | `loading \| local \| api` con fallback a NestJS | ✅ | F1 (local) / F3 (fallback) | Timeout duro 10–15s. Debounce 0ms local / 300–400ms API. |
| MessagePack / CBOR | — | ❌ Descartado | — | Tras Brotli, la ganancia no compensa el peso del decoder. |

---

## 4. Persistencia local

| Tecnología | Rol | Estado | Fase | Notas |
|---|---|---|---|---|
| **Dexie.js** sobre **IndexedDB** | Persistencia de "Mi lista" (offline-first) | ✅ | F1 | Se usa desde el MVP, sin etapa previa de `localStorage`. Fuente de verdad en cliente. Guarda también el espacio disponible declarado. |

---

## 5. PWA / offline

| Tecnología | Rol | Estado | Fase | Notas |
|---|---|---|---|---|
| **`@vite-pwa/astro`** + **Workbox** | Service worker y cacheo offline | ✅ | F3 | SW generado, no escrito a mano. Estrategias diferenciadas por tipo de recurso. |
| Manifest PWA | Instalación en home screen Android | ✅ | F3 | `display: standalone`, iconos múltiples, splash, `theme-color`. |

---

## 6. Imágenes

| Tecnología | Rol | Estado | Fase | Notas |
|---|---|---|---|---|
| **`astro:assets`** + **Sharp** | Descarga y optimización en build | ✅ | F1 | Genera AVIF + WebP + JPEG (fallback). `srcset` multi-tamaño. Sin hotlinking en runtime. |
| Caché de build de imágenes | Procesar solo imágenes nuevas/cambiadas | ✅ | F4 | Crítico cuando el catálogo crece a miles de items. |
| **Bunny.net** Storage + CDN | Hosting de imágenes externo | 🟣 Futuro | — | Si el build tarda demasiado por procesamiento de imágenes. |

---

## 7. Trailers / video

| Tecnología | Rol | Estado | Fase | Notas |
|---|---|---|---|---|
| **`lite-youtube-embed`** (Paul Irish) | Embeds ligeros de YouTube | ✅ | — | Elegido sobre `@justinribeiro/lite-youtube`. Es JS plano sin Shadow DOM: más liviano y sin la fricción de los web components con el ecosistema Preact. |

---

## 8. Infraestructura / deploy

| Tecnología | Rol | Estado | Fase | Notas |
|---|---|---|---|---|
| **VPS propio** | Hosting | ✅ | F1 | No edge global; latencia depende de ubicación del VPS. |
| **Caddy** | Web server | 🔵 Preferido | F1 | Preferido sobre nginx: TLS auto, Brotli + HTTP/2/3 por default. |
| **nginx** + `ngx_brotli` + Certbot | Web server (alternativa) | 🟡 Abierto | F1 | Si no se usa Caddy. Requiere config manual de Brotli, HTTP/2, TLS. |
| **Let's Encrypt** | TLS | ✅ | F1 | Vía Caddy automático o Certbot con nginx. |
| **Brotli** | Compresión de recursos de texto | ✅ | F1 | Verificar `Content-Encoding: br` en HTML/CSS/JS/JSON. |
| Swap atómico por symlink | Estrategia de deploy y rollback | ✅ | F2 | `current -> builds/<timestamp>/`. Rollback = reapuntar symlink. Mantener últimos 5–10 builds. |
| Lugar de ejecución del build | Mismo VPS / VPS separado / contenedor con límites | 🟡 Abierto | F2 | Compromiso entre simplicidad y aislamiento de CPU/RAM. |
| **Cloudflare** (plan gratis, modo proxy) | CDN + resiliencia + anti-DDoS | 🟣 Futuro | — | Cuando crezca el tráfico. Cero cambios en la arquitectura. |

---

## 9. Mensajería / integraciones

| Tecnología | Rol | Estado | Fase | Notas |
|---|---|---|---|---|
| `wa.me` (deep link WhatsApp) | Una de las cuatro vías de envío de lista | ✅ | F1 | Genera mensaje pre-formateado. Funciona offline. |

---

## 10. Testing

| Tecnología | Rol | Estado | Fase | Notas |
|---|---|---|---|---|
| **Vitest** | Pruebas unitarias y de integración | ✅ | — | Frontend y backend. Integra con el ecosistema Vite/Astro sin config extra. |
| **Playwright** | Pruebas end-to-end | ✅ | — | E2E contra el build estático servido. |

---

## 11. Diseño visual / UI

| Tecnología | Rol | Estado | Fase | Notas |
|---|---|---|---|---|
| **Tailwind CSS** | Sistema de estilado utility-first | ✅ | F1 | Base sobre la que opera daisyUI. Confirmar versión al integrar. |
| **daisyUI** | Librería de componentes sobre Tailwind | ✅ | F1 | Agnóstica de framework: funciona igual en `.astro` puro y dentro de islas Preact. Cero JS al navegador. Theming por variables CSS. Elegida sobre un port de shadcn porque un port (React/Vue/Svelte) ataría la UI a un framework y no serviría en los `.astro` estáticos. |
| **Tema claro/oscuro** | Light/dark mode | ✅ | F1 | Vía daisyUI: usa sus temas `light`/`dark` por variables CSS (atributo `data-theme`). Toggle manual + respeto de `prefers-color-scheme`. No requiere librería extra. Definir el `theme-color` del manifest PWA acorde a cada modo. |
| **Atomic Design** | Organización de componentes compartidos | ✅ | F1 | Aplica **solo** a la UI sin dueño de dominio (átomos/moléculas/organismos genéricos) en `shared/ui/`. La UI con lógica de negocio se queda en el `ui/` de su slice. Ver nota de conciliación abajo. |
| **Responsive (mobile-first)** | Adaptación a viewport | ✅ | F1 | Requisito del documento funcional, no librería: se implementa con los breakpoints de Tailwind. Mobile-first; desktop añade el navbar extendido y oculta la botonera inferior (doc funcional §5). |
| shadcn/ui (port a Preact) | — | ❌ Descartado | — | No existe port oficial a Preact. Vía `preact/compat` arrastra Radix (peso + bugs sutiles) y contradice el presupuesto de <100KB JS. daisyUI cubre la necesidad sin atar a framework. |
| Franken UI / Basecoat UI | — | 🟡 Evaluados | — | Alternativas agnósticas con estética shadcn. Descartadas a favor de daisyUI (más maduro y adoptado); Franken además arrastra UIkit. Quedan como respaldo si daisyUI no cubre algún componente. |

> **Conciliación Atomic Design ↔ vertical slicing.** El proyecto se organiza por slices verticales (ver `dahem_arquitectura_frontend.md`), lo que es transversalmente opuesto a agrupar por nivel atómico. Regla adoptada: Atomic Design rige **dentro de `shared/ui/`** para los componentes reutilizables sin dominio (Button, Input, Card, Modal base, etc.); los componentes que llevan lógica de negocio viven en `features/<slice>/ui/` y *componen* esos átomos/moléculas. Así no se rompe el screaming architecture: la raíz sigue gritando el negocio, y Atomic Design queda acotado a la capa compartida.


> Inspiración visual del documento funcional: **EPIX PLAY**. Paletas, tipografías y tokens concretos van en un documento de diseño aparte (pendiente). daisyUI define la base de componentes; el tema visual se ajusta sobre sus variables CSS.

---

## 12. Métricas objetivo (de la guía técnica §12)

Referencia para validar decisiones de stack en producción.

- JS en cliente: **<100KB** gzipped en página inicial.
- `search-index`: **<50KB** gzipped.
- LCP sobre 3G simulado: **<2.5s**.
- CLS: **<0.1**.
- Tiempo de build: **<5 min** para catálogo realista.

---

## Plantilla para agregar una tecnología nueva

Al evaluar o adoptar una tecnología, agregar una fila a la sección correspondiente con este formato:

```
| **Nombre** | Rol que cumple | Estado (✅/🔵/🟡/🟣/⚪/❌) | Fase | Razón de la elección y/o alternativas descartadas |
```

Y actualizar la fecha de "Última actualización" al inicio del documento.