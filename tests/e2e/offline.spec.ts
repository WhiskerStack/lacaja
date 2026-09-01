import { test, expect, type Page } from '@playwright/test';

// Soporte offline de la PWA (guía técnica §5.2). Requiere el build estático servido por
// `astro preview`: en `astro dev` no hay service worker.

/**
 * Deja el service worker activo y controlando la página. En la primera visita el SW se instala
 * después de que la página ya cargó, así que hace falta una navegación más para que la controle.
 */
async function serviceWorkerReady(page: Page): Promise<void> {
  await expect
    .poll(
      () => page.evaluate(async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        return Boolean(reg?.active);
      }),
      { timeout: 30_000, message: 'el service worker no llegó a activarse' },
    )
    .toBe(true);
  // El precache se llena durante el install: se espera a que la home esté guardada.
  await expect
    .poll(
      () => page.evaluate(async () => {
        for (const name of await caches.keys()) {
          const cache = await caches.open(name);
          if (await cache.match('/', { ignoreSearch: true })) return true;
        }
        return false;
      }),
      { timeout: 30_000, message: 'el precache no incluyó la home' },
    )
    .toBe(true);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), { timeout: 15_000 })
    .toBe(true);
}

test('las vistas principales y una ficha visitada funcionan sin conexión', async ({ page, context }) => {
  await page.goto('/');
  await serviceWorkerReady(page);

  // Se visita una ficha para que quede en la caché de navegación.
  await page.goto('/biblioteca');
  const href = await page.locator('.grid.grid-cols-3 > a').first().getAttribute('href');
  await page.goto(href!);
  await expect(page.getByRole('link', { name: 'Volver' })).toBeVisible();

  await context.setOffline(true);

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

  await page.goto('/biblioteca');
  await expect(page.getByRole('button', { name: 'Todos', exact: true })).toBeVisible();

  await page.goto('/buscar');
  await expect(page.getByPlaceholder(/Busca por nombre/)).toBeVisible();

  // La ficha visitada antes de perder la conexión sigue disponible.
  await page.goto(href!);
  await expect(page.getByRole('link', { name: 'Volver' })).toBeVisible();
});

test('una ficha no visitada cae en la página de respaldo, no en el error de red', async ({ page, context }) => {
  await page.goto('/');
  await serviceWorkerReady(page);

  const hrefs = await page.goto('/biblioteca').then(() =>
    page.locator('.grid.grid-cols-3 > a').evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute('href'))),
  );
  const noVisitada = hrefs.at(-1)!;

  await context.setOffline(true);
  const res = await page.goto(noVisitada);
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: /No pudimos mostrar esa ficha/ })).toBeVisible();
});
