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
    lines.push('🎬 Pedido Daher');
    if (this.data.customerName) lines.push(`Cliente: ${this.data.customerName}`);
    lines.push('');
    lines.push('Lista solicitada:');
    for (const it of this.data.items) {
      lines.push(`• ${it.code}  ${it.name} — ${formatGb(it.sizeGb)} — ${formatCup(it.price)}`);
    }
    lines.push('');
    lines.push(`Total: ${formatGb(this.data.totalGb)} · ${formatCup(this.data.totalPrice)}`);
    lines.push(`Artículos: ${this.data.items.length}`);
    return lines.join('\n');
  }

  /** Nombre de archivo sugerido para la exportación a TXT. */
  fileName(): string {
    const stamp = new Date().toISOString().slice(0, 10);
    return `pedido-daher-${stamp}.txt`;
  }

  /** URL de wa.me con el mensaje pre-formateado (funcional §7.4.2). */
  whatsappUrl(phoneNumber: string): string {
    const base = phoneNumber
      ? `https://wa.me/${phoneNumber.replace(/\D/g, '')}`
      : 'https://wa.me/';
    return `${base}?text=${encodeURIComponent(this.toText())}`;
  }
}
