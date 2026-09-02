// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwind from '@astrojs/tailwind';
import AstroPWA from '@vite-pwa/astro';

const SITE = process.env.SITE ?? 'https://dahem.example';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  output: 'static', // SSG puro
  trailingSlash: 'ignore',
  integrations: [
    preact({ compat: false }),
    tailwind({ applyBaseStyles: false }),
    AstroPWA({
      registerType: 'autoUpdate',
      workbox: {
        // Precacheamos TODO el HTML generado, incluidas las ~600 paginas de detalle
        // (/p/{id}, /s/{id}, /s/{id}/{temporada}, /s/{id}/{temporada}/{capitulo}).
        // Es el unico modo de que el catalogo sea navegable sin conexion: una regla
        // de runtime solo cachea lo que el usuario ya visito. Son ~600 ficheros de
        // ~20 KB (comprimidos viajan ~2 MB), asi que el coste de instalacion es bajo.
        // Las imagenes quedan FUERA del precache a proposito: los posters optimizados
        // pesan decenas de MB y se cachean bajo demanda con la regla CacheFirst.
        globPatterns: [
          '**/*.html',
          '_astro/**/*.{js,css,woff2}',
          '*.{svg,png,ico,webmanifest}',
          '{search,library}-index.json',
          'icons/*.png',
        ],
        // @vite-pwa/astro inyecta `navigateFallback: '/'` cuando la opcion no aparece,
        // y registra esa NavigationRoute ANTES de runtimeCaching. Resultado: cualquier
        // navegacion que no estuviera precacheada devolvia el HTML del home (el bug de
        // "los detalles me llevan al inicio") y dejaba muertas todas las reglas de
        // navegacion de abajo. Con la clave presente y sin valor no se registra la ruta
        // y el control vuelve a runtimeCaching.
        navigateFallback: undefined,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          // 1. Navegaciones (paginas). El precache resuelve todo lo que existia en el
          //    ultimo build; esta regla solo entra para URLs nuevas: intenta red, cae al
          //    cache y, si no hay nada, muestra el 404 precacheado.
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'dahem-html',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
              precacheFallback: { fallbackURL: '/404' },
            },
          },
          // 2. Imagenes (Cache First): posters optimizados y remotos, bajo demanda.
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'dahem-images',
              expiration: { maxEntries: 1500, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
          // 3. Indices de busqueda (Stale While Revalidate)
          {
            urlPattern: /\/(search|library)-index.*\.json$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'dahem-search-index' },
          },
          // 4. API (Network Only)
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
        ]
      },
    }),
  ],
  image: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'dummyimage.com' },
    ],
  },
  vite: {
    define: {
      __DAHEM_BUILD__: JSON.stringify(new Date().toISOString()),
    },
  },
});