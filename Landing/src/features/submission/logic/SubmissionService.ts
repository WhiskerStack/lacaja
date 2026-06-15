// SubmissionService: orquesta las cuatro vías de envío (funcional §7.4). Las reglas del
// mensaje viven en Submission (domain); el servicio coordina I/O del navegador y la API.
import { Submission } from '../domain/Submission';
import type { SubmissionChannel, SubmissionData } from '../types';

export interface WebSubmitDeps {
  /** fetch a inyectar (testeable) y URL del endpoint NestJS. */
  fetchFn: typeof fetch;
  apiUrl: string;
  token: string | null;
}

export class SubmissionService {
  constructor(
    private readonly whatsappNumber: string,
    private readonly web: WebSubmitDeps,
  ) {}

  build(data: SubmissionData): Submission {
    return new Submission(data);
  }

  /** Abre WhatsApp con el mensaje pre-formateado. Funciona offline. */
  sendWhatsapp(data: SubmissionData): void {
    const url = this.build(data).whatsappUrl(this.whatsappNumber);
    this.openExternal(url);
  }

  /** Descarga la lista como archivo TXT. Funciona offline. */
  downloadTxt(data: SubmissionData): void {
    const submission = this.build(data);
    const blob = new Blob([submission.toText()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = submission.fileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /** Copia el mensaje al portapapeles. Funciona offline. */
  async copyClipboard(data: SubmissionData): Promise<void> {
    const text = this.build(data).toText();
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    // Fallback para navegadores sin Clipboard API.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }

  /**
   * Envío por web (funcional §7.4.1): requiere sesión y red. Devuelve el submissionCode.
   * Stub graceful en F1 si el backend no responde.
   */
  async sendWeb(data: SubmissionData): Promise<{ submissionCode: string }> {
    if (!this.web.token) throw new Error('Se requiere iniciar sesión para enviar por la web.');
    const res = await this.web.fetchFn(`${this.web.apiUrl}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.web.token}`,
      },
      body: JSON.stringify({
        items: data.items,
        totalGb: data.totalGb,
        totalPrice: data.totalPrice,
      }),
    });
    if (!res.ok) throw new Error(`El envío falló (${res.status}).`);
    return (await res.json()) as { submissionCode: string };
  }

  private openExternal(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  static channels(): SubmissionChannel[] {
    return ['web', 'whatsapp', 'txt', 'clipboard'];
  }
}
