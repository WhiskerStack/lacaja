import { defineConfig, devices } from '@playwright/test';

// Config separada: sirve dos builds de dist-a y dist-b y permite alternarlos
// en caliente. Se ejecuta con `pnpm test:e2e:update`.
export default defineConfig({
  testDir: './tests/e2e/update',
  timeout: 90_000,
  use: { baseURL: 'http://localhost:4322' },
  webServer: {
    // Se construye dos veces cambiando el marcador para que el HTML difiera.
    // Ojo: __DAHEM_BUILD__ usa new Date(), así que dos builds consecutivos ya
    // son distintos. El env var solo garantiza que A y B se distingan.
    command:
      'pnpm build && mv dist dist-a && DAHEM_BUILD_TAG=b pnpm build && mv dist dist-b && node tests/e2e/fixtures/build-switch-server.mjs dist-a dist-b 4322',
    url: 'http://localhost:4322',
    env: { BASE_PATH: '/' },
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});