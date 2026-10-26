// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwind from '@astrojs/tailwind';
import AstroPWA from '@vite-pwa/astro';

const SITE = process.env.SITE ?? 'https://WhiskerStack.github.io/lacaja';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  output: 'static', // SSG puro
  trailingSlash: 'ignore',
  integrations: [
    preact({ compat: false }),
    tailwind({ applyBaseStyles: false }),
    AstroPWA({
      // autoUpdate: el SW nuevo se activa solo (skipWaiting + clients.claim) y el
      // script de Base.astro recarga la pestaña al recibir controllerchange.
      // Con 'prompt' el SW se quedaba en estado `waiting` esperando un botón que
      // casi nadie pulsa, así que la app seguía sirviendo el HTML viejo.
      registerType: 'autoUpdate',
      workbox: {
        // Solo precacheamos lo que NO tiene hash en el nombre y por tanto necesita
        // revisión explícita de Workbox:
        //   - **/*.html            → ~600 páginas (Home, /p/*, /s/*, /s/*/*, ...)
        //   - search/library-index → índices JSON de búsqueda y filtros
        //   - favicon / icons / manifest → PWA shell
        //
        // Los assets de /_astro/* (bundles JS, CSS, fuentes, pósters optimizados)
        // tienen hash de contenido en el nombre (main.a1b2c3.js, poster.4f5e.webp).
        // Esos NO van aquí: se sirven con `Cache-Control: immutable` 1 año desde
        // staticwebapp.config.json y se cachean con la regla runtime de abajo.
        // Si los precacheáramos, cada build re-descargaría ~1.200 pósters y ~50
        // bundles aunque el HTML no hubiera cambiado, y la instalación del SW en
        // móvil tardaría minutos (a mitad, el navegador la mata y nunca activa).
        globPatterns: [
          '**/*.html',
          '{search,library}-index.json',
          '*.{svg,png,ico,webmanifest}',
          'icons/*.png',
        ],

        // @vite-pwa/astro inyecta `navigateFallback: '/'` cuando la opción no aparece,
        // y registra esa NavigationRoute ANTES de runtimeCaching. Resultado: cualquier
        // navegación que no estuviera precacheada devolvía el HTML del home (el bug de
        // "los detalles me llevan al inicio") y dejaba muertas todas las reglas de
        // navegación de abajo. Con la clave presente y sin valor no se registra la ruta
        // y el control vuelve a runtimeCaching.
        navigateFallback: undefined,

        cleanupOutdatedCaches: true,

        runtimeCaching: [
          // 1. Assets con hash de contenido (_astro/**). CacheFirst puro: el nombre
          //    del fichero ES la versión, así que un deploy nuevo cambia el nombre y
          //    el SW simplemente guarda una entrada nueva. La vieja se queda huérfana
          //    hasta que la expira el `expiration`. No hay invalidación manual.
          //
          //    `cacheableResponse.statuses: [0, 200]` incluye 0 porque las imágenes
          //    cross-origin sin CORS devuelven respuestas opacas (status 0) y sin
          //    esto Workbox las descarta.
          {
            urlPattern: /\/_astro\/.+/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'dahem-assets',
              expiration: {
                maxEntries: 4000,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 año, igual que el header HTTP
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // 2. Navegaciones (páginas). El precache cubre todo el HTML del último
          //    build (revisionado por Workbox). Para URLs nuevas (un ítem agregado
          //    después del build) o HTML modificado, NetworkFirst con timeout de 3s:
          //    si la red va lenta, sirve lo cacheado en lugar de bloquear la
          //    navegación. Si la URL no está en ninguna caché y no hay red, cae al
          //    404 precacheado.
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'dahem-html-runtime',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              precacheFallback: { fallbackURL: '/404' },
            },
          },

          // 3. Índices de búsqueda. StaleWhileRevalidate: se sirve el índice cacheado
          //    al instante y se revalida en segundo plano. El índice cambia poco,
          //    así que el SW lo actualiza sin penalizar la primera pintura.
          {
            urlPattern: /\/(search|library)-index.*\.json$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'dahem-search-index' },
          },

          // 4. Imágenes que NO vienen de _astro (placeholders locales, TMDB si algo
          //    se escapa del optimizador de astro:assets). CacheFirst porque son
          //    inmutables en la práctica (mismo URL = mismo contenido).
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'dahem-images',
              expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // 5. API (futuro backend NestJS). NetworkOnly: nunca cachear respuestas
          //    de datos dinámicos.
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api'),
            handler: 'NetworkOnly',
          },
        ],
      },
      manifest: {
        name: 'La Caja — Catálogo audiovisual',
        short_name: 'La Caja',
        description: 'Catálogo de consulta de audiovisuales. Arma tu lista y envíala a Lacaja123.',
        lang: 'es',
        start_url: '/',
        display: 'standalone',
        background_color: '#0b0f17',
        theme_color: '#0b0f17',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
    }),
  ],
  image: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'dummyimage.com' },
    ],
  }
});