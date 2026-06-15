/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Configuración de Vite para el panel admin (SPA).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Alias "@" → src, igual que en las plantillas shadcn.
      '@': path.resolve(__dirname, './src'),
    },
  },
  // CAVEAT awilix (modo CLASSIC): resuelve dependencias por el NOMBRE del
  // parámetro del constructor. La minificación de producción renombra
  // parámetros y rompería esa resolución. `keepNames: true` indica a esbuild
  // que preserve los nombres de funciones/clases/parámetros relevantes.
  // Ver app/container.ts y el README (sección awilix).
  esbuild: {
    keepNames: true,
  },
  build: {
    target: 'es2022',
    minify: 'esbuild',
  },
  optimizeDeps: {
    // El paquete de dominio se consume como workspace; no pre-bundlear su fuente.
    include: ['react', 'react-dom'],
  },
  server: {
    port: 5174,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
