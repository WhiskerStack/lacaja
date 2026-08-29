import { test, expect } from '@playwright/test';

// Smoke E2E del flujo principal contra el build estático.
test('home carga con carátula y navega a un detalle', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.goto('/p/23');
  await expect(page.getByRole('heading', { name: /Gigante de Hierro/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Agregar a Mi lista/ })).toBeVisible();
});

test('biblioteca muestra grid y chips', async ({ page }) => {
  await page.goto('/biblioteca');
  await expect(page.getByRole('button', { name: 'Todos' })).toBeVisible();
});

test('buscar filtra por título', async ({ page }) => {
  await page.goto('/buscar');
  await page.getByPlaceholder(/Busca por nombre/).fill('Dune');
  await expect(page.getByText(/Dune/).first()).toBeVisible({ timeout: 10_000 });
});
