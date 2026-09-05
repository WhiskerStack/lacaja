// Tests de las banderas de proceso agrupadas en item.metadata: lectura, escritura
// dispersa (solo se guardan los `true`) y migración desde el formato antiguo.
import { describe, it, expect } from 'vitest';
import {
  METADATA_FLAGS,
  hasFlag,
  setFlag,
  setFlags,
  normalizeItemMetadata,
  normalizeCatalogMetadata,
  emptyMetadata,
} from '../../scripts/lib/metadata.mjs';

describe('metadata: lectura y escritura de banderas', () => {
  it('una bandera ausente es una bandera pendiente', () => {
    expect(hasFlag({}, 'enriched')).toBe(false);
    expect(hasFlag({ metadata: {} }, 'enriched')).toBe(false);
    expect(hasFlag({ metadata: { enriched: true } }, 'enriched')).toBe(true);
  });

  it('marcar avisa si hubo cambio y no repite trabajo', () => {
    const item: Record<string, any> = {};
    expect(setFlag(item, 'enriched')).toBe(true);
    expect(item.metadata).toEqual({ enriched: true });
    expect(setFlag(item, 'enriched')).toBe(false);
  });

  it('guarda disperso: desmarcar borra la clave en vez de escribir false', () => {
    const item = { metadata: { translated: true } };
    expect(setFlag(item, 'translated', false)).toBe(true);
    expect(item.metadata).toEqual({});
    expect(setFlag(item, 'translated', false)).toBe(false);
  });

  it('setFlags marca varias y reporta si alguna cambió', () => {
    const item: Record<string, any> = { metadata: { enriched: true } };
    expect(setFlags(item, ['enriched', 'genresEnriched'])).toBe(true);
    expect(item.metadata).toEqual({ enriched: true, genresEnriched: true });
    expect(setFlags(item, ['enriched', 'genresEnriched'])).toBe(false);
  });

  it('un ítem nuevo arranca sin nada procesado', () => {
    expect(emptyMetadata()).toEqual({});
  });
});

describe('metadata: migración desde el formato antiguo', () => {
  it('absorbe las banderas sueltas de la raíz y las borra de ahí', () => {
    const item: Record<string, any> = {
      code: 'P1',
      name: 'X',
      enriched: true,
      translated: true,
      genresEnriched: true,
      titlesChecked: true,
    };
    expect(normalizeItemMetadata(item)).toBe(true);
    expect(item.metadata).toEqual({
      enriched: true,
      translated: true,
      genresEnriched: true,
      titlesChecked: true,
    });
    for (const flag of METADATA_FLAGS) expect(flag in item).toBe(false);
    // Los datos del audiovisual no se tocan.
    expect(item.code).toBe('P1');
    expect(item.name).toBe('X');
  });

  it('una bandera antigua en false no se convierte en true', () => {
    const item: Record<string, any> = { enriched: false };
    normalizeItemMetadata(item);
    expect(item.metadata).toEqual({});
    expect(hasFlag(item, 'enriched')).toBe(false);
  });

  it('es idempotente: la segunda pasada no cambia nada', () => {
    const catalog: { items: Record<string, any>[] } = {
      items: [{ code: 'P1', enriched: true }, { code: 'P2' }],
    };
    expect(normalizeCatalogMetadata(catalog)).toBe(2);
    expect(normalizeCatalogMetadata(catalog)).toBe(0);
    expect(catalog.items[0].metadata).toEqual({ enriched: true });
    expect(catalog.items[1].metadata).toEqual({});
  });
});
