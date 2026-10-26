import { defineConfig, devices } from '@playwright/test';

// E2E contra el build estático servido por `astro preview` (especificaciones §8 testing).
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:4321' },
  webServer: {
    command: 'pnpm build && pnpm preview --port 4321',
    url: 'http://localhost:4321',
    // Los e2e navegan a rutas raíz (/buscar...), así que se compila sin el base de Pages.
    env: { BASE_PATH: '/' },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
