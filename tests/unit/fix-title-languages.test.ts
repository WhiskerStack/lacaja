import { describe, it, expect, vi, afterEach } from 'vitest';
// Script de build en JS puro: se importa para probar la lógica sin levantar Ollama.
import {
  sanitizeTitle,
  translateTitle,
  fixItem,
} from '../../scripts/fix-title-languages.mjs';

/** Simula Ollama devolviendo las respuestas en orden y registrando los prompts enviados. */
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

describe('sanitizeTitle', () => {
  it('se queda con la primera línea y limpia comillas y puntuación', () => {
    expect(sanitizeTitle('"Un lugar tranquilo".', 'A Quiet Place')).toBe('Un lugar tranquilo');
    expect(sanitizeTitle('El Padrino\nsegunda opción', 'The Godfather')).toBe('El Padrino');
    expect(sanitizeTitle('«Amelie»', 'Amelie')).toBe('Amelie');
  });

  it('quita el preámbulo con el que el modelo presenta la traducción', () => {
    expect(sanitizeTitle('El título en español es: La La Land', 'La La Land')).toBe('La La Land');
    expect(sanitizeTitle('Translation: The Night', 'Esa noche')).toBe('The Night');
  });

  it('descarta una respuesta vacía o ausente', () => {
    expect(sanitizeTitle('', 'X')).toBeNull();
    expect(sanitizeTitle(null, 'X')).toBeNull();
    expect(sanitizeTitle('   ', 'X')).toBeNull();
  });

  it('descarta una explicación en vez de un título: el modelo se justifica en lugar de traducir', () => {
    const excusa =
      'No puedo traducir este título porque se trata de un nombre propio que se mantiene igual';
    expect(sanitizeTitle(excusa, 'Anora')).toBeNull();
  });
});

describe('translateTitle', () => {
  it('pide el idioma correcto y limpia la respuesta', async () => {
    const prompts = stubOllama(['"Un lugar tranquilo"']);
    expect(await translateTitle('A Quiet Place', 'es')).toBe('Un lugar tranquilo');
    expect(prompts[0]).toContain('español');
  });

  it('para el otro sentido pide inglés', async () => {
    const prompts = stubOllama(['The Night']);
    expect(await translateTitle('Esa noche', 'en')).toBe('The Night');
    expect(prompts[0]).toContain('inglés');
  });

  it('devuelve null si la respuesta no sirve como título', async () => {
    stubOllama(['']);
    expect(await translateTitle('Anora', 'es')).toBeNull();
  });
});

describe('fixItem', () => {
  it('rellena name traduciendo enName al español', async () => {
    const prompts = stubOllama(['57 segundos']);
    const item = { code: 'P1', name: '', enName: '57 Seconds' } as Record<string, any>;
    const res = await fixItem(item);
    expect(res.action).toBe('translate');
    expect(item.name).toBe('57 segundos');
    expect(item.enName).toBe('57 Seconds');
    // Una sola llamada: el título que ya existe no se retraduce.
    expect(prompts).toHaveLength(1);
    expect(item.metadata).toMatchObject({ titlesChecked: true });
  });

  it('rellena enName traduciendo name al inglés', async () => {
    const prompts = stubOllama(['The Night']);
    const item = { code: 'S4', name: 'Esa noche', enName: '' } as Record<string, any>;
    const res = await fixItem(item);
    expect(res.action).toBe('translate');
    expect(item.enName).toBe('The Night');
    expect(item.name).toBe('Esa noche');
    expect(prompts).toHaveLength(1);
    expect(item.metadata).toMatchObject({ titlesChecked: true });
  });

  it('con ambos títulos presentes rehace los dos, uno en cada sentido', async () => {
    // Comportamiento actual del script: no detecta idiomas, retraduce ambos lados.
    const prompts = stubOllama(['A Simple Favor', 'Un pequeño favor']);
    const item = {
      code: 'P5',
      name: 'Un favor sencillo',
      enName: 'A Simple Favour',
    } as Record<string, any>;
    const res = await fixItem(item);
    expect(res.action).toBe('translate');
    expect(item.enName).toBe('A Simple Favor');
    expect(item.name).toBe('Un pequeño favor');
    expect(prompts).toHaveLength(2);
    expect(item.metadata).toMatchObject({ titlesChecked: true });
  });

  it('si solo prospera una de las dos traducciones, conserva el otro título', async () => {
    stubOllama(['', 'Un pequeño favor']);
    const item = {
      code: 'P6',
      name: 'Un favor sencillo',
      enName: 'A Simple Favour',
    } as Record<string, any>;
    expect((await fixItem(item)).action).toBe('translate');
    expect(item.enName).toBe('A Simple Favour');
    expect(item.name).toBe('Un pequeño favor');
  });

  it('si fallan las dos traducciones no toca el ítem ni lo marca', async () => {
    stubOllama(['', '']);
    const item = { code: 'P9', name: 'Anora', enName: 'Anora Film' } as Record<string, any>;
    const res = await fixItem(item);
    expect(res.action).toBe('skip');
    expect(res.changed).toBe(false);
    expect(item.name).toBe('Anora');
    expect(item.enName).toBe('Anora Film');
    expect(item.metadata?.titlesChecked).toBeUndefined();
  });

  it('con --dry-run informa qué haría pero no modifica el ítem', async () => {
    stubOllama(['A Simple Favor', 'Un pequeño favor']);
    const item = {
      code: 'P5',
      name: 'Un favor sencillo',
      enName: 'A Simple Favour',
    } as Record<string, any>;
    const res = await fixItem(item, { dryRun: true });
    expect(res.action).toBe('translate');
    expect(item.name).toBe('Un favor sencillo');
    expect(item.enName).toBe('A Simple Favour');
    expect(item.metadata).toBeUndefined();
  });

  it('no llama al modelo si el ítem no tiene ningún título', async () => {
    const prompts = stubOllama([]);
    const res = await fixItem({ code: 'P7', name: '', enName: '' });
    expect(res.action).toBe('skip');
    expect(prompts).toHaveLength(0);
  });

  it('absorbe la bandera suelta del formato antiguo en vez de duplicarla', async () => {
    stubOllama(['The Night']);
    const item = {
      code: 'S4',
      name: 'Esa noche',
      enName: '',
      titlesChecked: true,
    } as Record<string, any>;
    await fixItem(item);
    expect('titlesChecked' in item).toBe(false);
    expect(item.metadata).toEqual({ titlesChecked: true });
  });
});
