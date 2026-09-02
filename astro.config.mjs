// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwind from '@astrojs/tailwind';
import AstroPWA from '@vite-pwa/astro';

const SITE = process.env.SITE ?? 'https://dahem.example';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  output: 'static', // SSG puro (guía técnica §1.1)
  trailingSlash: 'ignore',
  integrations: [
    preact({ compat: false }),
    tailwind({ applyBaseStyles: false }), // los estilos base los aporta src/styles/global.css
    AstroPWA({
      registerType: 'autoUpdate',
      // Workbox genera el SW; estrategias por tipo de recurso (guía técnica §5.2).
      workbox: {
        // Precache solo el esqueleto: las tres vistas principales, el JS/CSS, los iconos y los
        // índices de búsqueda (~2 MB). Las 600+ fichas NO se precachean: son 12 MB de HTML que
        // casi nadie consulta entero, y se van guardando al visitarlas con la regla de navegación
        // de más abajo. Sin `**/*.html` aquí, la instalación en móvil con datos es asumible.
        globPatterns: [
          'index.html',
          '404.html',
          'biblioteca/index.html',
          'buscar/index.html',
          '_astro/**/*.{js,css,woff2}',
          '*.{svg,png,ico,webmanifest}',
          '{search,library}-index.json',
          'icons/*.png',
        ],
        // Sin navigateFallback: es configuración de SPA. Aquí interceptaría TODAS las
        // navegaciones y serviría siempre la misma página; en un sitio estático cada página se
        // sirve del precache o de la caché de navegación, y el respaldo offline va como
        // precacheFallback de esa regla.
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // HTML de páginas → stale-while-revalidate. Guarda cada ficha visitada, y si se pide
            // una que no está en caché sin conexión, responde con la página 404 (precacheada).
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'dahem-html',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              precacheFallback: { fallbackURL: '/404' },
            },
          },
          {
            // Imágenes de posters → cache-first (no re-descargar nunca)
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'dahem-images',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
          {
            // Índices de búsqueda → stale-while-revalidate (hash en nombre invalida)
            urlPattern: /\/(search|library)-index.*\.json$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'dahem-search-index' },
          },
          {
            // API NestJS → network-only (nunca cachear escrituras ni búsquedas live)
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
      // Expuesto a islas para el fallback de búsqueda y los enlaces de envío.
      __DAHEM_BUILD__: JSON.stringify(new Date().toISOString()),
    },
  },
});
