import { describe, it, expect, vi, afterEach } from 'vitest';
// Script de build en JS puro: se importa para probar la lógica sin levantar Ollama.
import {
  decideAction,
  sanitizeTitle,
  hasLetters,
  detectLanguages,
  translateTitle,
  fixItem,
} from '../../scripts/fix-title-languages.mjs';

/** Simula Ollama: primero responde la detección, después las traducciones. */
function stubOllama(responses: string[]) {
  const prompts: string[] = [];
  const queue = [...responses];
  vi.stubGlobal('fetch', async (_url: string, init: { body: string }) => {
    prompts.push(JSON.parse(init.body).prompt);
    return { ok: true, json: async () => ({ response: queue.shift() ?? '' }) };
  });
  return prompts;
}

afterEach(() => vi.unstubAllGlobals());

describe('decideAction', () => {
  const langs = (a: string, b: string, translatable = true) => ({ name: a, enName: b, translatable });

  it('deja en paz el par correcto', () => {
    expect(decideAction({ name: 'Un lugar tranquilo', enName: 'A Quiet Place', langs: langs('es', 'en') }))
      .toEqual({ action: 'ok' });
  });

  it('intercambia cuando el orden está al revés', () => {
    expect(decideAction({ name: 'A Quiet Place', enName: 'Un lugar tranquilo', langs: langs('en', 'es') }))
      .toEqual({ action: 'swap' });
  });

  it('con los dos en español rehace enName en inglés', () => {
    expect(decideAction({ name: 'El Padrino', enName: 'El Padrino II', langs: langs('es', 'es') }))
      .toMatchObject({ action: 'translate', field: 'enName', to: 'en', from: 'El Padrino' });
  });

  it('con los dos en inglés rehace name en español, conservando el inglés', () => {
    expect(decideAction({ name: 'The Godfather', enName: 'Godfather', langs: langs('en', 'en') }))
      .toMatchObject({ action: 'translate', field: 'name', to: 'es', from: 'Godfather' });
  });

  it('no inventa traducción para títulos que no cambian de idioma', () => {
    expect(decideAction({ name: 'Pluribus', enName: 'Pluribus X', langs: langs('en', 'en', false) }))
      .toMatchObject({ action: 'skip' });
  });

  it('no inventa nada con títulos idénticos que no cambian de idioma', () => {
    expect(decideAction({ name: 'Dune', enName: 'Dune', langs: langs('en', 'en', false) }))
      .toMatchObject({ action: 'skip' });
  });

  it('con títulos idénticos en inglés sí rehace el español', () => {
    expect(decideAction({ name: 'Moon Knight', enName: 'Moon Knight', langs: langs('en', 'en') }))
      .toMatchObject({ action: 'translate', field: 'name', to: 'es', from: 'Moon Knight' });
  });

  it('sin idiomas detectados pide análisis en vez de decidir a ciegas', () => {
    expect(decideAction({ name: 'A Quiet Place', enName: 'Un lugar tranquilo', langs: null }))
      .toEqual({ action: 'needs-detection' });
  });

  it('se abstiene cuando la detección no es concluyente', () => {
    expect(decideAction({ name: 'Ikiru', enName: 'Vivir', langs: langs('other', 'es') }))
      .toMatchObject({ action: 'skip' });
    expect(decideAction({ name: 'X', enName: 'Y', langs: langs('unknown', 'unknown') }))
      .toMatchObject({ action: 'skip' });
  });

  it('salta los ítems sin enName o sin letras', () => {
    expect(decideAction({ name: 'Algo', enName: '', langs: null })).toMatchObject({ action: 'skip', reason: 'sin enName' });
    expect(decideAction({ name: '65', enName: '65 (2023)', langs: langs('en', 'en') })).toMatchObject({ action: 'skip' });
  });
});

describe('hasLetters', () => {
  it('distingue títulos con letras de los puramente numéricos', () => {
    expect(hasLetters('180')).toBe(false);
    expect(hasLetters('65')).toBe(false);
    expect(hasLetters('Dune')).toBe(true);
    expect(hasLetters('Ñu')).toBe(true);
  });
});

describe('sanitizeTitle', () => {
  it('quita comillas, punto final y preámbulos del modelo', () => {
    expect(sanitizeTitle('"Un lugar tranquilo".', 'A Quiet Place')).toBe('Un lugar tranquilo');
    expect(sanitizeTitle('El título en español es: Un lugar tranquilo', 'A Quiet Place')).toBe('Un lugar tranquilo');
  });

  it('se queda con la primera línea', () => {
    expect(sanitizeTitle('Un lugar tranquilo\n\nNota: es el título oficial', 'A Quiet Place')).toBe('Un lugar tranquilo');
  });

  it('rechaza respuestas vacías o desproporcionadas', () => {
    expect(sanitizeTitle('', 'Dune')).toBeNull();
    expect(sanitizeTitle('   ', 'Dune')).toBeNull();
    expect(sanitizeTitle('Lo siento, no puedo traducir ese título porque parece un nombre propio inventado', 'Dune')).toBeNull();
  });
});

describe('detectLanguages', () => {
  it('normaliza la respuesta del modelo', async () => {
    stubOllama(['{"a":"en","b":"es","translatable":true}']);
    expect(await detectLanguages('A Quiet Place', 'Un lugar tranquilo'))
      .toEqual({ name: 'en', enName: 'es', translatable: true });
  });

  it('ante JSON inválido no arriesga: unknown', async () => {
    stubOllama(['no soy JSON']);
    expect(await detectLanguages('X', 'Y')).toEqual({ name: 'unknown', enName: 'unknown', translatable: false });
  });

  it('valores fuera del catálogo de idiomas caen a unknown', async () => {
    stubOllama(['{"a":"spanish","b":"en","translatable":true}']);
    expect((await detectLanguages('X', 'Y')).name).toBe('unknown');
  });

  it('pide la respuesta en formato JSON', async () => {
    const prompts: string[] = [];
    vi.stubGlobal('fetch', async (_u: string, init: { body: string }) => {
      const body = JSON.parse(init.body);
      prompts.push(body.format);
      return { ok: true, json: async () => ({ response: '{"a":"es","b":"en","translatable":true}' }) };
    });
    await detectLanguages('A', 'B');
    expect(prompts[0]).toBe('json');
  });
});

describe('translateTitle', () => {
  it('pide el idioma correcto y limpia la respuesta', async () => {
    const prompts = stubOllama(['"Un lugar tranquilo"']);
    expect(await translateTitle('A Quiet Place', 'es')).toBe('Un lugar tranquilo');
    expect(prompts[0]).toContain('español');
  });
});

describe('fixItem', () => {
  it('intercambia sin gastar una llamada de traducción', async () => {
    const prompts = stubOllama(['{"a":"en","b":"es","translatable":true}']);
    const item = { code: 'P1', name: '57 Seconds', enName: '57 segundos' } as Record<string, unknown>;
    const res = await fixItem(item);
    expect(res.action).toBe('swap');
    expect(item.name).toBe('57 segundos');
    expect(item.enName).toBe('57 Seconds');
    expect(item.titlesChecked).toBe(true);
    expect(prompts).toHaveLength(1);
  });

  it('con ambos en inglés traduce name y deja enName intacto', async () => {
    stubOllama(['{"a":"en","b":"en","translatable":true}', 'Un pequeño favor']);
    const item = { code: 'P5', name: 'A Simple Favor', enName: 'A Simple Favour' } as Record<string, unknown>;
    const res = await fixItem(item);
    expect(res.action).toBe('translate');
    expect(item.name).toBe('Un pequeño favor');
    expect(item.enName).toBe('A Simple Favour');
  });

  it('con ambos en español rehace enName', async () => {
    stubOllama(['{"a":"es","b":"es","translatable":true}', 'The Night']);
    const item = { code: 'S4', name: 'Esa noche', enName: 'Esa noche II' } as Record<string, unknown>;
    await fixItem(item);
    expect(item.name).toBe('Esa noche');
    expect(item.enName).toBe('The Night');
  });

  it('no toca el ítem correcto', async () => {
    stubOllama(['{"a":"es","b":"en","translatable":true}']);
    const item = { code: 'S1', name: 'Se tiene que morir mucha gente', enName: 'Many People Need To Die' } as Record<string, unknown>;
    expect((await fixItem(item)).action).toBe('ok');
    expect(item.name).toBe('Se tiene que morir mucha gente');
  });

  it('descarta una traducción que no parece un título', async () => {
    stubOllama([
      '{"a":"en","b":"en","translatable":true}',
      'No puedo traducir este título porque se trata de un nombre propio que se mantiene igual',
    ]);
    const item = { code: 'P9', name: 'Anora', enName: 'Anora Film' } as Record<string, unknown>;
    const res = await fixItem(item);
    expect(res.action).toBe('skip');
    expect(item.name).toBe('Anora');
    expect(item.titlesChecked).toBeUndefined();
  });

  it('con --dry-run no modifica el ítem', async () => {
    stubOllama(['{"a":"en","b":"es","translatable":true}']);
    const item = { code: 'P1', name: '57 Seconds', enName: '57 segundos' } as Record<string, unknown>;
    const res = await fixItem(item, { dryRun: true });
    expect(res.action).toBe('swap');
    expect(item.name).toBe('57 Seconds');
    expect(item.titlesChecked).toBeUndefined();
  });

  it('no llama al modelo si falta enName', async () => {
    const prompts = stubOllama([]);
    const res = await fixItem({ code: 'P7', name: 'Solo español', enName: '' });
    expect(res.action).toBe('skip');
    expect(prompts).toHaveLength(0);
  });
});
