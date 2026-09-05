import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Tests unitarios de dominio/lógica (sin DOM): entorno node.
// El alias "@/" replica el de tsconfig.json: sin él los tests que importan por ruta
// absoluta (@/domains/PriceRate) ni siquiera se cargan.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
