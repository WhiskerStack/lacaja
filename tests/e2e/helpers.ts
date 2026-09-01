import type { Page } from '@playwright/test';

/**
 * Espera a que las islas Preact estén hidratadas: Astro quita el atributo `ssr` de
 * <astro-island> al montar. Sin esto, los clics y el tecleo previos se pierden.
 */
export async function hydrated(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const islands = Array.from(document.querySelectorAll('astro-island'));
    return islands.length > 0 && islands.every((el) => !el.hasAttribute('ssr'));
  });
}
