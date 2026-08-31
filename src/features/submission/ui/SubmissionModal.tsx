import { useStore } from '@nanostores/preact';
import { useState } from 'preact/hooks';
import { FileText, Clipboard, Share2 } from 'lucide-preact'; // <-- nuevo
import { $submissionOpen, closeSubmissionModal } from '../store';
import { $list } from '../../my-list/store';
import { submissionService } from '../../../app/container';
import { pushToast, toastError } from '../../../app/stores/toast';
import type { SubmissionData } from '../types';

export default function SubmissionModal() {
  const open = useStore($submissionOpen);
  const list = useStore($list);
  const [sentCode, setSentCode] = useState<string | null>(null);

  if (!open) return null;

  const data: SubmissionData = {
    items: list?.items ?? [],
    totalGb: list?.totalGb ?? 0,
    totalPrice: list?.totalPrice ?? 0,
  };

  async function copy() {
    try {
      await submissionService.copyClipboard(data);
      pushToast({ message: 'Lista copiada al portapapeles', durationMs: 3000 });
    } catch (e) {
      toastError(e);
    }
  }

  function shareList() {
    const text = submissionService.build(data).toText();
    if (navigator.share) {
      navigator.share({ title: 'Mi lista de La Caja', text })
        .catch((e) => {
          if (e.name !== 'AbortError') toastError(e);
        });
    } else {
      copy();
    }
  }

  return (
    <div class="modal modal-open">
      <div class="modal-box">
        <h3 class="text-lg font-bold mb-1">Enviar lista</h3>
        <p class="text-sm opacity-70 mb-4">Elige cómo quieres hacer llegar tu pedido al negocio.</p>

        {sentCode ? (
          <div class="alert alert-success">
            <span>Pedido enviado. Tu código es <b class="font-mono">{sentCode}</b>. Muéstralo en el encuentro presencial.</span>
          </div>
        ) : (
          <div class="grid gap-2">
            <button type="button" class="btn justify-start gap-3" onClick={() => submissionService.downloadTxt(data)}>
              <FileText size={20} /> Exportar a TXT
            </button>
            <button type="button" class="btn justify-start gap-3" onClick={copy}>
              <Clipboard size={20} /> Copiar al portapapeles
            </button>
            <button type="button" class="btn justify-start gap-3" onClick={shareList}>
              <Share2 size={20} /> Compartir…
            </button>
          </div>
        )}

        <div class="modal-action">
          <button type="button" class="btn btn-ghost" onClick={() => { setSentCode(null); closeSubmissionModal(); }}>
            Cerrar
          </button>
        </div>
      </div>
      <div class="modal-backdrop" onClick={closeSubmissionModal} />
    </div>
  );
}