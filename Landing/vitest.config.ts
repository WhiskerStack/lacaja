import { defineConfig } from 'vitest/config';

// Tests unitarios de dominio/lógica (sin DOM): entorno node. Resuelve @dahem/domain del workspace.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
