import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Vitest usa esbuild por defecto, que no emite metadata de decoradores.
// unplugin-swc hace que compile con SWC (mismo del arranque) y herede la
// config de decoradores: imprescindible para los tests que tocan la DI de Nest.
export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
  },
  // module.type es6: deja los tests como ESM (si no, SWC los compila a CommonJS
  // y vitest no puede importarse con require()). Mantiene la metadata de decoradores.
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
