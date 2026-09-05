import { test, expect } from '@playwright/test';
import { hydrated } from './helpers';

// Smoke E2E del flujo principal contra el build estático.
test('home carga con carátula y navega a un detalle', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // Los ids del catálogo son UUID: se toma una ficha real del propio grid en vez de fijar uno.
  await page.goto('/biblioteca');
  await hydrated(page);
  await page.locator('.grid.grid-cols-3 > a').first().click();
  await expect(page).toHaveURL(/\/p\/|\/s\//);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: /Agregar a Mi lista/ })).toBeVisible();
});

test('biblioteca muestra grid y chips', async ({ page }) => {
  await page.goto('/biblioteca');
  await expect(page.getByRole('button', { name: 'Todos' })).toBeVisible();
});

test('buscar filtra por título', async ({ page }) => {
  await page.goto('/buscar');
  await hydrated(page);
  await page.getByPlaceholder(/Busca por nombre/).fill('Dune');
  await expect(page.locator('main ul.space-y-2 > li').first()).toBeVisible({ timeout: 10_000 });
});
