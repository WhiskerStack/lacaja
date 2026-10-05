import { test, expect, type Page } from '@playwright/test';

async function swReady(page: Page): Promise<void> {
    await expect
        .poll(() => page.evaluate(async () => {
            const reg = await navigator.serviceWorker.getRegistration();
            return Boolean(reg?.active);
        }), { timeout: 60_000 })
        .toBe(true);
    await page.reload();
    await expect
        .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), { timeout: 15_000 })
        .toBe(true);
}

async function marker(page: Page): Promise<string | null> {
    return page.locator('meta[name="build-marker"]').getAttribute('content');
}

test('un deploy nuevo activa el SW y recarga con la versión actualizada', async ({ page }) => {
    // 1. Carga la versión A y deja el SW activo y controlando.
    await page.goto('/');
    await swReady(page);
    const markerA = await marker(page);
    expect(markerA).toBeTruthy();

    // 2. El "servidor" cambia a servir la versión B.
    await page.evaluate(() => fetch('/__switch?to=b').then((r) => r.text()));

    // 3. Forzamos la comprobación del SW (equivale al setInterval de Base.astro).
    await page.evaluate(async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        await reg?.update();
    });

    // 4. Con autoUpdate el SW nuevo hace skipWaiting, dispara controllerchange y
    //    Base.astro recarga. Esperamos a que el marcador cambie.
    await expect
        .poll(() => marker(page), {
            timeout: 30_000,
            message: 'la página no se recargó con la nueva versión',
        })
        .not.toBe(markerA);

    const markerB = await marker(page);
    expect(markerB).toBeTruthy();
    expect(markerB).not.toBe(markerA);

    // 5. El SW nuevo precachea solo el HTML que cambió: la nueva Home debe estar
    //    en el precache revisado, no depender de red.
    const homeHtmlCached = await page.evaluate(async () => {
        const precacheName = (await caches.keys()).find((n) => n.startsWith('workbox-precache'));
        if (!precacheName) return false;
        const cache = await caches.open(precacheName);
        const cached = await cache.match('/');
        if (!cached) return false;
        const html = await cached.text();
        return html.includes('build-marker');
    });
    expect(homeHtmlCached).toBe(true);
});

test('sin deploy nuevo, el SW no se re-instala ni recarga la página', async ({ page }) => {
    await page.goto('/');
    await swReady(page);
    const markerBefore = await marker(page);
    const reloads: number[] = [];
    page.on('load', () => reloads.push(Date.now()));

    // Forzamos update() varias veces: el sw.js es el mismo, así que no debe pasar nada.
    for (let i = 0; i < 3; i++) {
        await page.evaluate(async () => {
            const reg = await navigator.serviceWorker.getRegistration();
            await reg?.update();
        });
        await page.waitForTimeout(500);
    }

    await page.waitForTimeout(2_000);
    expect(await marker(page)).toBe(markerBefore);
    // Solo el load inicial: ningún reload espurio por controllerchange.
    expect(reloads.length).toBeLessThanOrEqual(1);
});

test('tras un deploy, los _astro/* viejos no se vuelven a pedir por HTTP', async ({
    page, context,
}) => {
    // 1. Carga build A, dejamos que el SW popule dahem-assets.
    await page.goto('/');
    await swReady(page);
    await page.goto('/biblioteca');

    const assetUrlsA = await page.evaluate(async () => {
        const cache = await caches.open('dahem-assets');
        return (await cache.keys()).map((r) => new URL(r.url).pathname);
    });
    expect(assetUrlsA.length).toBeGreaterThan(0);

    // 2. Deploy: cambiamos a build B y forzamos update.
    await page.evaluate(() => fetch('/__switch?to=b').then((r) => r.text()));
    await page.evaluate(async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        await reg?.update();
    });

    // 3. Esperamos el reload con la versión nueva.
    await expect
        .poll(() => page.evaluate(() => document.querySelector('meta[name="build-marker"]')?.getAttribute('content')))
        .not.toBe(null);

    // 4. Contamos peticiones de red a _astro/*: en una navegación normal a /biblioteca
    //    bajo el SW, los _astro/* deben servirse de dahem-assets sin tocar la red.
    const astroRequests: string[] = [];
    page.on('request', (req) => {
        const url = new URL(req.url());
        if (url.pathname.startsWith('/_astro/')) astroRequests.push(url.pathname);
    });

    await page.goto('/biblioteca');
    await page.waitForLoadState('networkidle');

    // El HTML nuevo puede referenciar algunos _astro/* nuevos (bundles cambiados),
    // pero los que ya estaban cacheados con el mismo hash no deben re-pedirse.
    const yaCacheados = new Set(assetUrlsA);
    const repetidos = astroRequests.filter((p) => yaCacheados.has(p));
    expect(repetidos, `assets re-pedidos pese a estar en caché: ${repetidos.join(', ')}`).toEqual([]);
});