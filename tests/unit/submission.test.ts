// Tests del mensaje de envío (Submission) y de la generación de la URL de WhatsApp.
import { describe, it, expect } from 'vitest';
import { Submission } from '../../src/features/submission/domain/Submission';
import type { SubmissionData } from '../../src/features/submission/types';

const data: SubmissionData = {
  items: [
    { code: 'P0023', level: 'audiovisual', targetId: 23, name: 'El Gigante de Hierro', sizeGb: 1.4, price: 10 },
    { code: 'S1122-3', level: 'season', targetId: 11223, name: 'Tronos de Ceniza · T3', sizeGb: 2.98, price: 10 },
  ],
  totalGb: 4.38,
  totalPrice: 20,
  customerName: 'Ana Pérez',
};

describe('Submission', () => {
  it('genera un mensaje legible con códigos, totales y cliente', () => {
    const text = new Submission(data).toText();
    expect(text).toContain('Pedido Dahem');
    expect(text).toContain('Cliente: Ana Pérez');
    expect(text).toContain('P0023');
    expect(text).toContain('El Gigante de Hierro');
    expect(text).toContain('S1122-3');
    expect(text).toContain('20 CUP');
    expect(text).toContain('Artículos: 2');
  });

  it('construye una URL de wa.me con el número y el mensaje codificado', () => {
    const url = new Submission(data).whatsappUrl('+53 5000-0000');
    expect(url.startsWith('https://wa.me/5350000000?text=')).toBe(true);
    expect(decodeURIComponent(url)).toContain('Pedido Dahem');
  });

  it('reporta lista vacía', () => {
    expect(new Submission({ items: [], totalGb: 0, totalPrice: 0 }).isEmpty).toBe(true);
  });
});
