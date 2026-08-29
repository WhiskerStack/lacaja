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
  constructor() { }

  build(data: SubmissionData): Submission {
    return new Submission(data);
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

  static channels(): SubmissionChannel[] {
    return ['web', 'whatsapp', 'txt', 'clipboard'];
  }
}
