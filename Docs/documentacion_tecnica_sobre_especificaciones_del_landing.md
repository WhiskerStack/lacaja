# Daher — Guía arquitectónica para el frontend

> Documento de referencia para construir la web del catálogo de Daher. Complementa al documento funcional (`documentacion_no_tecnica_de_la_landing_page.md`). Este archivo describe **qué arquitectura usar y por qué**, no la implementación funcional (eso ya está en el otro doc).

---

## 1. Stack y modelo de rendering

### 1.1. Decisión

- **Astro en modo SSG puro** (Static Site Generation).
- No hay SSR. No hay funciones serverless de Astro.
- El backend (NestJS) existe pero **no sirve la web**. Solo provee APIs para escrituras y para fallback de búsqueda.

### 1.2. Razones de esta elección

- **Aislamiento de fallos parciales**: si el proceso de NestJS muere pero el servidor web (nginx/Caddy) sigue arriba, la web sigue navegable. El usuario puede explorar catálogo, armar lista, exportar TXT. Solo se rompen las funciones que requieren backend.
- **Costo de serving mínimo**: servir archivos estáticos consume mucho menos CPU/RAM que correr SSR. Sobrevive mejor a picos de tráfico.
- **Robustez frente a conexiones intermitentes**: una vez cargado, sigue funcionando offline (combinado con PWA).
- **Builds reproducibles y rollback trivial**: cada build genera un directorio. Rollback = cambiar un symlink.
- **Facilita meter CDN delante después**: si se quiere maximizar resiliencia geográfica, basta con poner Cloudflare (gratis) delante del VPS. La arquitectura SSG ya está lista para eso.

### 1.3. Caveat importante sobre hosting en VPS propio

El despliegue es en **VPS propio**, no en CDN edge. Esto implica:

- **No hay edge global**: el primer byte llega tan rápido como tu VPS responda desde su ubicación. Si el VPS está geográficamente lejos, la latencia es real.
- **Si el VPS entero se cae, todo se cae**: el aislamiento es a nivel de proceso (nginx vs Node), no a nivel de infraestructura.
- **Brotli, HTTP/2, caché headers, TLS**: hay que configurarlos manualmente en el web server. No vienen gratis como en los hosts edge.
- **Considerar a futuro**: Cloudflare gratis delante del VPS resuelve el problema de resiliencia geográfica sin costo y sin tocar la arquitectura.

### 1.4. Qué NO se considera

- SSR de Astro: descartado por riesgo de dependencia en runtime.
- Next.js: descartado. La elección de Astro es deliberada.

---

## 2. Modelo híbrido: SSG + Backend para escrituras

### 2.1. Lo que vive en SSG

- Todas las páginas del catálogo: Home, Biblioteca, Buscar, detalles de audiovisuales (películas, series, temporadas, capítulos).
- Índices JSON para búsqueda y filtros (pre-generados en build).
- Imágenes optimizadas (procesadas en build).
- Assets estáticos (CSS, JS de islas Astro).

### 2.2. Lo que vive en backend (NestJS)

- Auth (login/registro).
- Persistencia de "Mi lista" cuando el usuario tiene sesión.
- Registro de solicitudes de contenido no disponible (§6.4.3 del doc funcional).
- Endpoint de envío de lista por web.
- **Endpoint de búsqueda** (fallback usado mientras el JSON local no se ha descargado).
- Endpoint para disparar rebuilds (`POST /admin/publish`).
- Cron job interno que dispara rebuilds automáticos.

### 2.3. La coherencia conceptual

La regla mental: **lectura siempre desde SSG, escritura siempre contra backend**. La única excepción es búsqueda en estado `loading` que va contra el backend temporalmente.

---

## 3. Estrategia de rebuild

### 3.1. Arquitectura del rebuild en VPS

Como el hosting es VPS propio, no hay deploy hooks de proveedor. El flujo se construye así:

1. **Script de build** vive en el VPS (o en un servidor de build separado si se prefiere aislar).
   - Hace pull del repo de Astro.
   - Hace fetch del catálogo actual desde NestJS (o lee de DB directamente).
   - Ejecuta `astro build`.
   - **Swap atómico**: genera el build en un directorio temporal (`dist-new`), y al terminar hace un rename a `dist` (o cambia el symlink al que apunta nginx). Esto evita servir builds a medio generar.
   - Limpia builds antiguos (mantener los últimos N para rollback rápido).

2. **Endpoint webhook en NestJS**: `POST /admin/publish` (con autenticación).
   - Verifica permisos.
   - Dispara el script de build (ejecutar como subprocess, encolar en queue, o trigger por systemd).
   - Registra en DB: quién publicó, cuándo, resultado del build.
   - Rate-limit para evitar disparos múltiples accidentales.

3. **Dos disparadores del webhook**:
   - **Cron job en NestJS**, programado a las 2:00 AM diariamente.
     - Antes de disparar, verifica si hay cambios en el catálogo desde el último build. Si no hay cambios, no rebuildea.
   - **Botón "Publicar cambios" en el panel admin**, que hace POST al mismo endpoint.

### 3.2. Por qué este patrón

- El admin no necesita conocer detalles de infraestructura.
- Auditabilidad: queda registro en la DB de cada publicación.
- Swap atómico evita que el usuario reciba HTML inconsistente durante el build.
- El cron cubre "olvidé publicar" sin requerir intervención manual.
- Permite carga de contenido durante el día con publicación al final, o publicación on-demand cuando hay urgencia.

### 3.3. Manejo de la ventana entre rebuilds

**Decisión adoptada**:

- El admin puede forzar rebuild manual cuando agrega contenido importante.
- Aceptar el desfase para contenido no urgente. Para un negocio donde el usuario igual va presencial, el desfase de horas no es crítico.

**No se implementa**: sello visible de "última actualización" ni fallback automático a API cuando búsqueda local no encuentra resultados (para mantener simplicidad).

### 3.4. Cosas a tener en cuenta del build en VPS

- **Recursos del VPS**: el build de Astro consume CPU/RAM. Si el VPS es chico y el build coincide con tráfico real, puede degradar la web. Considerar ejecutarlo en horario de bajo tráfico o aislar el proceso (nice, cpulimit, contenedor con límites).
- **Tiempo de build**: con catálogo grande + procesamiento de imágenes, puede tomar varios minutos. El swap atómico hace que esto sea invisible al usuario.
- **Logs**: capturar stdout/stderr del build en un archivo accesible desde el admin para diagnosticar fallos.

---

## 4. Búsqueda híbrida (API + JSON local)

### 4.1. Tres estados de la búsqueda

```typescript
type SearchMode = 'loading' | 'local' | 'api';
```

- **`loading`**: aún no llega el JSON, no ha fallado tampoco → usar API.
- **`local`**: JSON listo en memoria → búsqueda instantánea, sin red.
- **`api`**: descarga del JSON falló (timeout, 404, parser error) → usar API permanentemente esta sesión.

**Timeout duro**: 10-15 segundos. Si el JSON no llega en ese tiempo, mover a modo `api` y reintentar después.

### 4.2. Precarga del JSON

- Precargar en **idle time** con `requestIdleCallback`, no esperar a que el usuario entre a Buscar.
- Usar `<link rel="prefetch" href="/search-index.json" as="fetch" crossorigin>` en el `<head>` de todas las páginas.
- Para cuando el usuario llega a Buscar, el JSON ya está en caché HTTP.

### 4.3. Debounce diferenciado

- **Modo local**: 0ms de debounce. Búsqueda en cada tecla. Es gratis.
- **Modo API**: 300-400ms de debounce. Evita request por cada tecla.
- **Mínimo de caracteres antes de buscar**: 2 o 3. Una sola letra no aporta valor.

### 4.4. Formato del índice JSON

**Decisiones**:

- **Brotli en el servidor**: configurar **nginx con `ngx_brotli`** o **Caddy** (Brotli viene por default). Asegurar que el web server sirva con `Content-Encoding: br` para todos los recursos de texto (HTML, CSS, JS, JSON). Verificar en DevTools que el header esté presente.
- **Nivel 1 de optimización**: diccionarios + tuplas posicionales.
  ```json
  {
    "v": 1,
    "genres": ["acción", "drama", "ciencia ficción", "comedia"],
    "items": [
      ["P0023", "El Gigante de Hierro", 1999, [0, 2]],
      ["P0451", "Dune 3", 2026, [2, 1]]
    ]
  }
  ```
- **No usar MessagePack/CBOR** por ahora. Después de Brotli, la ganancia no compensa el peso del decoder.
- **Hash en el nombre del archivo**: `search-index.a3f2.json`. Elimina problemas de versionado y caché stale.
- **Campo `v` (versión)** dentro del archivo como seguro adicional.

### 4.5. Dos índices separados

- **`search-index.json`**: solo `{código, título}`. Minúsculo (~30KB gzipped para 5000 items). Para autocomplete.
- **`library-index.json`**: `{código, título, año, género, región, idioma}`. Más grande. Se descarga solo cuando el usuario entra a Biblioteca con filtros.

Ambos se generan en el mismo build pass desde la misma fuente, garantizando consistencia.

### 4.6. Librería de búsqueda: MiniSearch

**Decisión**: **MiniSearch** sobre FlexSearch.

Razones:

- **Mejor manejo de acentos en español** out-of-the-box vía `processTerm`. Matchea "cancion" → "Canción", crítico para usuarios cubanos que muchas veces escriben sin tildes.
- **API limpia y bien documentada**. FlexSearch es marginalmente más rápido pero su documentación es notoriamente confusa, lo que cuesta tiempo de equipo en debugging.
- **Fuzzy + prefix juntos**: cubre tanto autocomplete por título como búsqueda jerárquica por código (§2.3 del doc funcional).
- **Tamaño similar (~20-30KB)**, no es un diferenciador real.
- **Para la escala esperada** (miles, no millones de items), la diferencia de performance entre las dos es imperceptible.

Configuración inicial sugerida:

```typescript
new MiniSearch({
  fields: ['t', 'c'],
  storeFields: ['c', 't', 'y', 'g', 'k'],
  searchOptions: {
    fuzzy: 0.2,
    prefix: true,
    boost: { t: 2 }  // título pesa más que otros campos
  },
  processTerm: (term) => term.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
})
```

El `processTerm` con `normalize('NFD')` quita acentos tanto en el índice como en el query, haciendo la búsqueda accent-insensitive en ambas direcciones.

### 4.7. Mínimo de validación antes de buscar

Antes de invocar la búsqueda (local o API):
- Query trimmed con al menos 2-3 caracteres.
- Si menos, no buscar y limpiar resultados previos.

---

## 5. PWA y offline-first

### 5.1. Objetivo

El usuario debe poder usar la app **completamente offline** después de la primera visita, excepto las acciones que inherentemente requieren backend (login, envío de lista por web, registrar solicitud de contenido).

### 5.2. Service Worker

- **No escribir el SW a mano**. Usar **Workbox** vía la integración **`@vite-pwa/astro`**.
- Estrategias de cacheo por tipo de recurso:

| Tipo de recurso | Estrategia |
|---|---|
| HTML de páginas | `stale-while-revalidate` |
| CSS, JS (con hash) | `cache-first` con expiración larga |
| Imágenes de posters | `cache-first` con expiración (no re-descargar nunca si ya están) |
| `search-index.[hash].json` | `stale-while-revalidate` (hash en nombre invalida automáticamente) |
| `library-index.[hash].json` | `stale-while-revalidate` |
| Llamadas a API NestJS | `network-only` (nunca cachear escrituras ni búsquedas live) |

### 5.3. Manifest PWA

- Configurar para instalación en home screen de Android.
- Iconos en múltiples tamaños.
- Splash screen.
- `display: standalone` para apariencia de app nativa.
- `theme-color` coherente con la identidad visual (inspiración EPIX PLAY).

### 5.4. Detección de estado de red

- Mostrar indicador discreto cuando el usuario está offline (banner sutil, no modal intrusivo).
- Deshabilitar (con feedback claro) las acciones que requieren red: "Enviar por la web", "Solicitar contenido no disponible", login/registro.
- Las otras tres vías de envío (WhatsApp, TXT, copiar al portapapeles) siguen funcionando offline.

---

## 6. Persistencia local de "Mi lista"

### 6.1. Stack

- **Dexie.js** sobre **IndexedDB**. No usar `localStorage` para esto (capacidad limitada, API síncrona bloquea el thread).

### 6.2. Estrategia offline-first

- **`localStorage`/IndexedDB es siempre la fuente de verdad en cliente.**
- Un proceso en background sincroniza con backend cuando hay red **y** hay sesión.
- Si el usuario está offline y agrega/quita items, todo funciona normal. La sync ocurre cuando vuelve la red.

### 6.3. Sincronización con cuenta

- Si el usuario no tiene sesión: la lista vive solo en IndexedDB.
- Si el usuario se loguea después de haber armado lista sin sesión: **merge** de la lista local con la lista de la cuenta (estrategia: union de items, mantener cantidades/preferencias locales si hay conflicto).
- Si el usuario ya tiene sesión: cambios locales se replican a la cuenta vía API cuando hay red.

### 6.4. Estructura de datos

Cada item de la lista guarda:
- Código del audiovisual (clave primaria).
- Snapshot mínimo: nombre, peso GB, precio (para mostrar en el drawer sin necesidad de re-fetch).
- Timestamp de agregado (para `Deshacer` y para sync conflict resolution).

### 6.5. Comparación contra espacio disponible (§7.3)

- El input de espacio disponible se guarda también en IndexedDB (persistente para la sesión, no se pierde al cerrar).

---

## 7. Imágenes

### 7.1. Estrategia: descarga + optimización en build (Opción A)

- Cuando el admin registra un audiovisual, anota la URL de la imagen origen.
- Durante el build de Astro: descargar todas las imágenes, optimizarlas, meterlas en `/public/posters/`.
- **No hotlinking en runtime**. Riesgos descartados: 403 por hotlink protection, URLs que cambian, performance impredecible, CLS, formatos no optimizados.

### 7.2. Implementación

- Usar **`astro:assets`** con `<Image />` y la integración de **Sharp**.
- Generar:
  - **AVIF** (mejor compresión, soporte moderno).
  - **WebP** (fallback).
  - **JPEG** (fallback final, navegadores muy viejos — opcional según target).
- Múltiples tamaños según uso:
  - Grid de Biblioteca: pequeño (~150-200px ancho).
  - Carrusel de Home: medio (~300-400px ancho).
  - Hero de detalle: grande (~800-1200px ancho).
- Usar `srcset` con varios tamaños para que el navegador elija el adecuado.
- `loading="lazy"` excepto para imágenes above-the-fold (LCP).
- Especificar `width` y `height` para evitar CLS.

### 7.3. Caché de build

- Implementar caché que solo procese imágenes nuevas o cambiadas, no todas en cada build. Crítico cuando el catálogo crece a miles de items.

### 7.4. Posibilidad futura

Si el build empieza a tardar demasiado por procesamiento de imágenes:
- Migrar a **Bunny.net Storage + CDN** (~$0.01/GB) o similar.
- Pre-optimizar y subir las imágenes en el flujo del admin (no en cada build).

---

## 8. Componentes interactivos (islas Astro)

### 8.1. Islas que necesita la app

- **Navbar**: badge de contador de "Mi lista", indicador de sesión activa.
- **Drawer "Mi lista"**: lista, totales, comparación contra espacio, botón enviar.
- **Modales de login/registro**: invocables desde múltiples lugares.
- **Modal de opciones de envío**.
- **Buscador**: input con autocomplete.
- **Filtros de Biblioteca**: panel de filtros, ordenamiento.
- **Carruseles**: Home (carátula y recomendados), trailers, sugerencias.

### 8.2. Estado compartido entre islas

Las islas Astro están aisladas por defecto. Para el estado compartido (especialmente "Mi lista" que debe ser visible desde el navbar y el drawer en cualquier página):

- Usar **`nanostores`** + adapter para Astro/React/Vue/Svelte (el que se elija para las islas).
- Stores persistentes para "Mi lista" sincronizados con IndexedDB.
- Store para el estado de sesión.
- Store para el modo de búsqueda (`loading | local | api`).

### 8.3. Framework de islas: Preact

**Decisión**: **Preact** sobre React, Svelte, Solid.

Razones:

- **Peso mínimo en cliente** (~3KB runtime vs ~45KB de React). Crítico para Cuba.
- **API compatible con React**: si en el futuro se decide migrar a React (o reusar código del ecosistema React), el costo es bajo.
- **Soporte first-class de Astro** vía `@astrojs/preact`.
- **Adapter de nanostores disponible** (`@nanostores/preact`).

Reglas de uso:

- **No mezclar** Preact con otros frameworks de islas. Cada framework adicional suma su runtime al bundle.
- Para componentes triviales (sin estado interactivo) **no usar Preact en absoluto**: dejarlos como Astro components puros (`.astro`). Cero JS en cliente.
- Solo hidratar islas cuando es necesario: `client:visible` para componentes below-the-fold, `client:load` solo para el navbar y otros componentes inmediatamente interactivos.

### 8.4. FOUC del badge de "Mi lista"

- Problema: en el primer render del navbar, el JS de la isla aún no ha leído IndexedDB, así que el contador parpadea.
- Solución: placeholder neutro (sin número) hasta que la isla se hidrate y lea el valor real. **No** mostrar "0" como placeholder porque luego salta a "3" — peor que no mostrar nada.

---

## 9. Estructura de URLs

### 9.1. Rutas estáticas generadas

- `/` — Home
- `/buscar` — Buscar
- `/biblioteca` — Biblioteca

### 9.2. Rutas dinámicas (generadas con `getStaticPaths`)

- `/p/[id]` — Detalle de película.
- `/s/[id]` — Detalle de serie (vista global).
- `/s/[id]/[temporada]` — Detalle de temporada.
- `/s/[id]/[temporada]/[capitulo]` — Detalle de capítulo.
- Misma estructura para otros tipos episódicos (novela, show, anime).

### 9.3. Reglas

- URLs sin extensión, limpias.
- Códigos en URL coinciden con códigos del documento funcional (§2): `P0023`, `S1122`, `S1122-3-10` pero traducidos a paths jerárquicos para que el sitio sea navegable estáticamente.
- 404 personalizado para audiovisuales no encontrados (caso: alguien recibe un código de algo que se agregó después del último build).

---

## 10. Orden de implementación (MVP primero)

### 10.1. Fase 1 — MVP funcional

Objetivo: app navegable de extremo a extremo, sin offline.

1. Setup de Astro SSG.
2. Lectura de catálogo desde fuente (API NestJS en build-time, o JSON export).
3. Generación de páginas estáticas: Home, Biblioteca, Buscar, detalles.
4. Imágenes optimizadas con `astro:assets`.
5. "Mi lista" en `localStorage` simple (sin Dexie aún).
6. Las cuatro vías de envío (las tres sin auth funcionan; "Enviar por web" stub).
7. Buscador con índice JSON local básico (sin fallback a API aún).
8. Deploy inicial al VPS con nginx/Caddy sirviendo el directorio `dist`. Configurar TLS (Let's Encrypt), Brotli, HTTP/2, caché headers.

### 10.2. Fase 2 — Backend + auth

1. Endpoints NestJS para auth, Mi lista, solicitudes, envío por web.
2. Modales de login/registro funcionales.
3. Integración del botón "Publicar cambios" en admin con el webhook propio (`POST /admin/publish`) que dispara el script de build con swap atómico.
4. Cron de rebuild a las 2 AM con detección de cambios.

### 10.3. Fase 3 — Offline + PWA

1. Migrar "Mi lista" de localStorage a Dexie.js + IndexedDB.
2. Sincronización offline-first con backend.
3. Configurar `@vite-pwa/astro` con Workbox.
4. Manifest PWA, iconos, splash.
5. Estrategias de cacheo por tipo de recurso.
6. Indicador de estado de red.
7. Fallback API en búsqueda para estado `loading`.

### 10.4. Fase 4 — Optimizaciones

1. Dos índices separados (search vs library).
2. Diccionarios + tuplas posicionales en JSON.
3. Hash en nombres de archivos de índices.
4. Caché de build para imágenes.
5. Medición real de tamaños en 3G simulado.
6. Ajustes según métricas reales.

---

## 11. Infraestructura del VPS

### 11.1. Web server

- **Caddy** preferido sobre nginx por simplicidad: TLS automático con Let's Encrypt, Brotli + Gzip por default, HTTP/2 y HTTP/3 sin configuración extra.
- **Si se usa nginx**: instalar `ngx_brotli`, configurar Let's Encrypt vía Certbot, habilitar HTTP/2.

### 11.2. Configuración mínima de headers

- `Cache-Control: public, max-age=31536000, immutable` para assets con hash en el nombre (CSS, JS, JSON con hash, imágenes).
- `Cache-Control: public, max-age=0, must-revalidate` para HTML (siempre revalidar para que un rebuild sea visible).
- `Service-Worker-Allowed: /` si el service worker no está en root.
- `Content-Security-Policy` apropiado.

### 11.3. Estructura de directorios sugerida

```
/var/www/daher/
  current -> builds/2026-05-15-1423/    # symlink al build activo
  builds/
    2026-05-15-1423/                     # último build
    2026-05-14-0200/                     # build anterior (rollback rápido)
    2026-05-13-0200/                     # más viejo
```

- nginx/Caddy sirve desde `current`.
- El script de build genera un directorio nuevo en `builds/`, y al terminar cambia el symlink. Swap atómico.
- Rollback = apuntar `current` al build anterior. Segundos.
- Cleanup periódico de builds viejos (mantener los últimos 5-10).

### 11.4. Proceso de build

- **Donde corre**: opciones de menor a mayor aislamiento:
  - **Mismo VPS**: simple, pero el build compite por CPU/RAM con el web server y el backend.
  - **VPS de build separado**: aislamiento real, requiere sincronización del output.
  - **Contenedor con límites** (CPU/RAM caps): compromiso razonable si todo va en un VPS.
- **Disparado por**: el webhook de NestJS lo invoca como subprocess o lo encola en una queue (BullMQ ya está en el stack de NestJS, aprovecharlo).
- **Logs**: capturar a archivo, exponer en admin para diagnóstico.

### 11.5. Consideración a futuro: Cloudflare gratis delante

Cuando crezca el tráfico o se quiera maximizar resiliencia:

- Cloudflare en modo proxy delante del VPS, plan gratis.
- Cachea estáticos en edge global.
- Si el VPS se cae, Cloudflare sigue sirviendo lo cacheado.
- Mitigación de DDoS incluida.
- Cero costo, cero cambio en la arquitectura del frontend.

No es necesario al principio, pero la arquitectura SSG ya está lista para esto sin modificación.

## 12. Métricas a vigilar en producción

- **Tamaño total del JS en cliente** (objetivo: <100KB gzipped en página inicial).
- **Tamaño del/los índices JSON** (objetivo: <50KB gzipped para search-index).
- **LCP (Largest Contentful Paint) sobre 3G simulado** (objetivo: <2.5s).
- **CLS (Cumulative Layout Shift)** (objetivo: <0.1).
- **Tiempo de build** (objetivo: <5 min para catálogo realista).
- **Tasa de uso de modo `api` vs `local`** en búsqueda (si `api` es alto, mejorar precarga).
- **Tasa de fallos del fetch de índice** (si es alto, revisar timeouts y reintentos).

---

## 13. Restricciones y consideraciones del entorno

### 13.1. Cuba específicamente

- Banda ancha intermitente y lenta. Cada KB importa.
- Devices modestos. Bundle JS mínimo, evitar bloqueo del main thread.
- Conexiones que se cortan a media descarga. Reintentos con backoff.
- Datos móviles caros. Service worker debe maximizar cache para evitar re-descargas.

### 13.2. Operacionales

- El admin no es técnico (asumir): UI clara, mensajes en español, feedback inmediato.
- Errores del backend deben tener fallback grácil en frontend. No pantallas en blanco, no errores crípticos.

---

## 14. Lo que esta guía NO cubre

- Diseño visual específico (paletas, tipografías, espaciados): inspiración EPIX PLAY, pero los detalles van en otro doc.
- Implementación del panel admin: documento aparte.
- Arquitectura del backend NestJS: documento aparte.
- Búsqueda avanzada / vectorial: documento aparte.
- Estrategia de testing.
- CI/CD pipeline específico.
- Monitoreo y alertas en producción.