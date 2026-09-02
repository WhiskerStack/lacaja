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
      { timeout: 60_000, message: 'el service worker no llegó a activarse' },
    )
    .toBe(true);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), { timeout: 15_000 })
    .toBe(true);
}

/** Comprueba que una URL concreta quedó guardada en alguna caché del navegador. */
function isPrecached(page: Page, url: string): Promise<boolean> {
  return page.evaluate(async (target) => {
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      if (await cache.match(target, { ignoreSearch: true })) return true;
    }
    return false;
  }, url);
}

test('las vistas principales funcionan sin conexión', async ({ page, context }) => {
  await page.goto('/');
  await serviceWorkerReady(page);

  await context.setOffline(true);

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

  await page.goto('/biblioteca');
  await expect(page.getByRole('button', { name: 'Todos', exact: true })).toBeVisible();

  await page.goto('/buscar');
  await expect(page.getByPlaceholder(/Busca por nombre/)).toBeVisible();
});

test('una ficha nunca visitada se abre sin conexión', async ({ page, context }) => {
  await page.goto('/');
  await serviceWorkerReady(page);

  await page.goto('/biblioteca');
  const hrefs = await page
    .locator('.grid.grid-cols-3 > a')
    .evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute('href')!));
  expect(hrefs.length).toBeGreaterThan(1);
  const noVisitada = hrefs.at(-1)!;

  // El precache tarda en llenarse (~600 páginas): se espera a que esta ficha esté dentro.
  await expect
    .poll(() => isPrecached(page, noVisitada), {
      timeout: 60_000,
      message: `la ficha ${noVisitada} no entró al precache`,
    })
    .toBe(true);

  await context.setOffline(true);

  const res = await page.goto(noVisitada);
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('link', { name: 'Volver' })).toBeVisible();
  // Es la ficha real, no el respaldo 404 ni el home.
  await expect(page.getByRole('heading', { name: /No pudimos mostrar esa ficha/ })).toHaveCount(0);
  expect(new URL(page.url()).pathname).toBe(noVisitada);
});

test('los niveles de una serie (temporada y capítulo) se abren sin conexión', async ({ page, context }) => {
  await page.goto('/');
  await serviceWorkerReady(page);

  // Los carruseles del home traen series ya renderizadas en el HTML estático.
  const serieHref = await page
    .locator('a[href^="/s/"]')
    .first()
    .getAttribute('href');
  test.skip(!serieHref, 'el home no mostró ninguna serie');

  // Los niveles se descubren leyendo el HTML de la serie con fetch(): a diferencia de una
  // navegación, no pasa por la regla de runtime, así que no contamina la caché dahem-html.
  const niveles = await page.evaluate(async (base) => {
    const enlaces = async (url: string, patron: RegExp) => {
      const html = await (await fetch(url)).text();
      return [...html.matchAll(patron)].map((m) => m[0]);
    };
    const temporadas = await enlaces(base, new RegExp(`${base}/\\d+(?=")`, 'g'));
    if (!temporadas.length) return null;
    const temporada = temporadas[0];
    const capitulos = await enlaces(temporada, new RegExp(`${temporada}/\\d+(?=")`, 'g'));
    return { temporada, capitulo: capitulos[0] ?? null };
  }, serieHref!);
  // Se salta mientras el catálogo no traiga `seasons`: sin ellas no se generan estas páginas.
  test.skip(!niveles?.capitulo, 'ninguna serie del catálogo tiene temporadas/capítulos generados');

  const rutas = [serieHref!, niveles!.temporada, niveles!.capitulo!];

  await expect
    .poll(() => isPrecached(page, rutas[2]), {
      timeout: 60_000,
      message: `${rutas[2]} no entró al precache`,
    })
    .toBe(true);

  await context.setOffline(true);

  for (const url of rutas) {
    const res = await page.goto(url);
    expect(res?.status(), `respuesta de ${url}`).toBe(200);
    expect(new URL(page.url()).pathname, `URL final de ${url}`).toBe(url);
    await expect(page.getByRole('heading', { name: /No pudimos mostrar esa ficha/ })).toHaveCount(0);
  }
});

test('los pósters de la biblioteca se ven sin conexión y no salen de TMDB', async ({ page, context }) => {
  const remotas: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('image.tmdb.org')) remotas.push(req.url());
  });

  await page.goto('/');
  await serviceWorkerReady(page);

  // El precache incluye ~1.200 imágenes: se espera a que una del grid esté guardada.
  await page.goto('/biblioteca');
  const primerPoster = await page.locator('.grid.grid-cols-3 img').first().getAttribute('src');
  expect(primerPoster, 'la isla debe apuntar a un asset local optimizado').toMatch(/^\/_astro\/.+\.(webp|avif)$/);
  await expect
    .poll(() => isPrecached(page, primerPoster!), {
      timeout: 60_000,
      message: `${primerPoster} no entró al precache`,
    })
    .toBe(true);

  await context.setOffline(true);
  remotas.length = 0;

  await page.goto('/biblioteca');
  const cargadas = await page
    .locator('.grid.grid-cols-3 img')
    .evaluateAll((els) =>
      els.slice(0, 6).map((e) => (e as HTMLImageElement).complete && (e as HTMLImageElement).naturalWidth > 0),
    );
  expect(cargadas.length).toBeGreaterThan(0);
  expect(cargadas.every(Boolean), 'algún póster del grid no se pintó offline').toBe(true);
  expect(remotas, 'la isla siguió pidiendo imágenes a TMDB').toEqual([]);
});

test('una URL que no existía en el último build cae en el 404, no en el home', async ({ page, context }) => {
  await page.goto('/');
  await serviceWorkerReady(page);

  await context.setOffline(true);

  const res = await page.goto('/p/no-existe-en-el-catalogo');
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: /No pudimos mostrar esa ficha/ })).toBeVisible();
});
