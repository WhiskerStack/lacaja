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
        globPatterns: ['**/*.{html,js,css,svg,png,webp,avif,ico,json,woff2}'],
        navigateFallback: '/404',
        runtimeCaching: [
          {
            // HTML de páginas → stale-while-revalidate
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'dahem-html' },
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
        description: 'Catálogo de consulta de audiovisuales. Arma tu lista y envíala al negocio.',
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
  },
  vite: {
    define: {
      // Expuesto a islas para el fallback de búsqueda y los enlaces de envío.
      __DAHEM_BUILD__: JSON.stringify(new Date().toISOString()),
    },
  },
});
