import { test, expect } from '@playwright/test';
import { hydrated } from './helpers';

// "Atrás" debe devolver al usuario al mismo sitio: filtros, paginación y scroll (funcional §6.5).

test('biblioteca: atrás restaura filtro, paginación y scroll', async ({ page }) => {
  await page.goto('/biblioteca');
  await hydrated(page);
  await page.getByRole('button', { name: 'Películas', exact: true }).click();
  await expect(page).toHaveURL(/tipo=movie/);

  // Carga varias páginas del scroll infinito y baja.
  const grid = page.locator('.grid.grid-cols-3 > a');
  const initial = await grid.count();
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
  }
  const loaded = await grid.count();
  expect(loaded).toBeGreaterThan(initial);

  const scrollBefore = await page.evaluate(() => window.scrollY);
  expect(scrollBefore).toBeGreaterThan(500);

  // Se abre una ficha desde una tarjeta ya visible: así la posición de salida es la real.
  await grid.nth(loaded - 1).click();
  await expect(page).toHaveURL(/\/p\/|\/s\//);

  await page.goBack();
  await expect(page).toHaveURL(/tipo=movie/);
  // El chip filtrado sigue activo y no se volvió a la primera página del grid.
  await expect(page.getByRole('button', { name: 'Películas', exact: true })).toHaveClass(/btn-primary/);
  // Puede haber cargado alguna página más al quedar el sentinel a la vista; nunca menos.
  await expect.poll(() => grid.count()).toBeGreaterThanOrEqual(loaded);
  await expect
    .poll(() => page.evaluate(() => window.scrollY), { timeout: 5_000 })
    .toBeGreaterThan(scrollBefore - 100);
});

test('buscar: atrás restaura la consulta y sus resultados', async ({ page }) => {
  await page.goto('/buscar');
  await hydrated(page);
  await page.getByPlaceholder(/Busca por nombre/).fill('Dune');
  const results = page.locator('main ul.space-y-2 > li > a');
  await expect(results.first()).toBeVisible({ timeout: 10_000 });
  await expect(page).toHaveURL(/q=Dune/);

  await results.first().click();
  await expect(page).toHaveURL(/\/p\/|\/s\//);

  await page.goBack();
  await expect(page.getByPlaceholder(/Busca por nombre/)).toHaveValue('Dune');
  await expect(results.first()).toBeVisible({ timeout: 10_000 });
});

test('detalle: el botón atrás vuelve a la vista anterior', async ({ page }) => {
  await page.goto('/biblioteca');
  await hydrated(page);
  await page.getByRole('button', { name: 'Series', exact: true }).click();
  await expect(page).toHaveURL(/tipo=series/);
  await page.locator('.grid.grid-cols-3 > a').first().click();

  await page.getByRole('link', { name: 'Volver' }).click();
  await expect(page).toHaveURL(/\/biblioteca\?tipo=series/);
});

test('detalle abierto en frío: el botón atrás lleva al nivel superior', async ({ page }) => {
  await page.goto('/biblioteca');
  await hydrated(page);
  const href = await page.locator('.grid.grid-cols-3 > a').first().getAttribute('href');
  // Entrada directa (enlace compartido): sin referrer propio, "Volver" no debe salir del sitio.
  await page.goto(href!);
  await page.getByRole('link', { name: 'Volver' }).click();
  await expect(page).toHaveURL(/^https?:\/\/[^/]+\/$/);
});

test('entrar por el menú a biblioteca no arrastra filtros viejos', async ({ page }) => {
  await page.goto('/biblioteca?tipo=movie');
  await hydrated(page);
  await expect(page.getByRole('button', { name: 'Películas', exact: true })).toHaveClass(/btn-primary/);
  await page.goto('/biblioteca');
  await hydrated(page);
  await expect(page.getByRole('button', { name: 'Todos', exact: true })).toHaveClass(/btn-primary/);
});

test('home: atrás restaura la posición del carrusel', async ({ page }) => {
  await page.goto('/');
  const rail = page.locator('.dahem-rail').first();
  await rail.evaluate((el) => el.scrollTo({ left: 400 }));
  await page.waitForTimeout(300);
  const left = await rail.evaluate((el) => el.scrollLeft);
  expect(left).toBeGreaterThan(300);

  // Se abre una ficha del propio carril (ya visible tras el desplazamiento).
  const poster = rail.locator('a').nth(3);
  await poster.click();
  await expect(page).toHaveURL(/\/p\/|\/s\//);

  await page.goBack();
  await expect
    .poll(() => rail.evaluate((el) => el.scrollLeft), { timeout: 5_000 })
    .toBeGreaterThan(left - 100);
});
