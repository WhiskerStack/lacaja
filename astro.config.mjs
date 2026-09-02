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
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          // 1. Páginas de detalle de películas (/p/{id})
          {
            urlPattern: /^\/p\/[^/]+$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'dahem-detail-p',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              precacheFallback: { fallbackURL: '/404' },
            },
          },
          // 2. Páginas de detalle de series y sus niveles (/s/{id}, /s/{id}/{temporada}, /s/{id}/{temporada}/{capitulo})
          {
            urlPattern: /^\/s\/[^/]+(\/\d+(\/\d+)?)?$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'dahem-detail-s',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              precacheFallback: { fallbackURL: '/404' },
            },
          },
          // 3. Resto de navegaciones (página principal, biblioteca, buscar)
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'dahem-html',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
              precacheFallback: { fallbackURL: '/404' },
            },
          },
          // 4. Imágenes (Cache First)
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'dahem-images',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
          // 5. Índices de búsqueda (Stale While Revalidate)
          {
            urlPattern: /\/(search|library)-index.*\.json$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'dahem-search-index' },
          },
          // 6. API (Network Only)
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