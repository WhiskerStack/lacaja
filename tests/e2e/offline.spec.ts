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

function inAnyCache(page: Page, url: string): Promise<boolean> {
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
    .poll(() => inAnyCache(page, noVisitada), {
      timeout: 60_000,
      message: `la ficha ${noVisitada} no entró a ninguna caché`,
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
    .poll(() => inAnyCache(page, rutas[2]), {
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

test('los pósters se sirven sin conexión desde dahem-assets (no desde TMDB)', async ({ page, context }) => {
  const remotas: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('image.tmdb.org')) remotas.push(req.url());
  });

  await page.goto('/');
  await serviceWorkerReady(page);

  await page.goto('/biblioteca');
  const primerPoster = await page.locator('.grid.grid-cols-3 img').first().getAttribute('src');
  expect(primerPoster, 'la isla debe apuntar a un asset local optimizado').toMatch(/^\/_astro\/.+\.(webp|avif)$/);

  // Con la nueva estrategia los _astro/* NO van al precache: los cachea la
  // regla runtime CacheFirst en `dahem-assets` al pasar por el SW.
  await expect
    .poll(() => inAnyCache(page, primerPoster!), {
      timeout: 30_000,
      message: `${primerPoster} no entró a ninguna caché del SW`,
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

test('el precache contiene HTML pero ningún asset hashed de _astro', async ({ page }) => {
  await page.goto('/');
  await serviceWorkerReady(page);

  const entries = await page.evaluate(async () => {
    const precacheName = (await caches.keys()).find((n) => n.startsWith('workbox-precache'));
    if (!precacheName) return [];
    const cache = await caches.open(precacheName);
    return (await cache.keys()).map((r) => new URL(r.url).pathname);
  });

  expect(entries.length).toBeGreaterThan(0);

  // Regla dura: ningún /_astro/*.webp|js|css puede estar en el precache.
  // Si esto falla, globPatterns en astro.config.mjs incluyó _astro/**
  // (rompe el install en móvil y re-descarga todo en cada deploy).
  const astroEnPrecache = entries.filter((p) => p.startsWith('/_astro/'));
  expect(astroEnPrecache, `assets hashed en precache: ${astroEnPrecache.slice(0, 5).join(', ')}`).toEqual([]);

  // Debe haber HTML: Home, 404, biblioteca, buscar, y varias fichas.
  expect(entries.some((p) => p === '/' || p === '/index.html')).toBe(true);
  expect(entries.some((p) => p === '/biblioteca' || p === '/biblioteca/index.html')).toBe(true);
  expect(entries.filter((p) => p.startsWith('/p/') || p.startsWith('/s/')).length).toBeGreaterThan(10);
});

test('los assets hashed se cachean en dahem-assets tras una navegación', async ({ page }) => {
  await page.goto('/');
  await serviceWorkerReady(page);
  // Reload bajo control del SW: la segunda visita es donde el SW intercepta
  // los _astro/* y los mete en dahem-assets.
  await page.goto('/biblioteca');

  const assets = await page.evaluate(async () => {
    const cache = await caches.open('dahem-assets');
    return (await cache.keys()).map((r) => new URL(r.url).pathname);
  });

  expect(assets.length).toBeGreaterThan(0);
  expect(assets.every((p) => p.startsWith('/_astro/'))).toBe(true);
});

test('el HTML dinámico se sirve desde la caché de runtime cuando la red va lenta', async ({
  page, context,
}) => {
  // Precalentamos: una visita normal para que el SW tenga todo cacheado.
  await page.goto('/');
  await serviceWorkerReady(page);
  await page.goto('/biblioteca');

  // Throttle brutal: cualquier petición a red tarda 10s. El NetworkFirst con
  // networkTimeoutSeconds: 3 debe servir el HTML cacheado mucho antes.
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/_astro/') || url.pathname.endsWith('.json')) {
      await route.continue();
      return;
    }
    await new Promise((r) => setTimeout(r, 10_000));
    await route.continue();
  });

  const start = Date.now();
  await page.goto('/biblioteca');
  const elapsed = Date.now() - start;

  // < 3s de red + margen: prueba de que vino de caché y no esperó al timeout.
  expect(elapsed, `tardó ${elapsed}ms: probablemente no usó la caché`).toBeLessThan(5_000);
  await expect(page.getByRole('button', { name: 'Todos', exact: true })).toBeVisible();
});
