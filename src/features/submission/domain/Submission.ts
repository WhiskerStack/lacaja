// Submission: clase de dominio que genera el mensaje pre-formateado del envío (funcional §7.4).
// Cero I/O, cero imports de Preact/Astro (arquitectura §3b). La UI/servicio decide a qué canal va.
import { formatCup, formatGb } from '../../../shared/format';
import type { SubmissionData } from '../types';

export class Submission {
  constructor(private readonly data: SubmissionData) {}

  get isEmpty(): boolean {
    return this.data.items.length === 0;
  }

  /** Mensaje de texto plano, legible para el vendedor (WhatsApp, TXT, portapapeles). */
  toText(): string {
    const lines: string[] = [];
    lines.push('🎬 Pedido La Caja');
    lines.push('');
    lines.push('Lista solicitada:');
    for (const it of this.data.items) {
      lines.push(`• ${it.code}  ${it.name} — ${formatGb(it.sizeGb)} — ${formatCup(it.price)}`);
    }
    lines.push('');
    lines.push(`Artículos: ${this.data.items.length}`);
    return lines.join('\n');
  }

  /** Nombre de archivo sugerido para la exportación a TXT. */
  fileName(): string {
    const stamp = new Date().toISOString().slice(0, 10);
    return `pedido-dahem-${stamp}.txt`;
  }
}
