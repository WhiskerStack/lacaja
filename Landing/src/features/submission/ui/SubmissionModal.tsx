// Modal de envío con las cuatro vías (funcional §7.4). web → requiere sesión y red;
// las otras tres funcionan offline. Lee el snapshot de la lista del store.
import { useStore } from '@nanostores/preact';
import { useState } from 'preact/hooks';
import { $submissionOpen, closeSubmissionModal } from '../store';
import { $list } from '../../my-list/store';
import { $session, isLoggedIn } from '../../../app/stores/session';
import { $online } from '../../../app/stores/network';
import { openAuthModal } from '../../account/store';
import { submissionService } from '../../../app/container';
import { pushToast, toastError } from '../../../app/stores/toast';
import type { SubmissionData } from '../types';

export default function SubmissionModal() {
  const open = useStore($submissionOpen);
  const list = useStore($list);
  const session = useStore($session);
  const online = useStore($online);
  const [sentCode, setSentCode] = useState<string | null>(null);

  if (!open) return null;

  const data: SubmissionData = {
    items: list?.items ?? [],
    totalGb: list?.totalGb ?? 0,
    totalPrice: list?.totalPrice ?? 0,
    customerName: session.user ? `${session.user.firstName} ${session.user.lastName}`.trim() : undefined,
  };

  async function sendWeb() {
    if (!isLoggedIn(session)) {
      // Pide cuenta sin salir de la vista (funcional §4.3) y reintenta al loguear.
      openAuthModal({ reason: 'para enviar tu lista por la web', onSuccess: sendWeb });
      return;
    }
    try {
      const { submissionCode } = await submissionService.sendWeb(data);
      setSentCode(submissionCode);
      pushToast({ message: `Enviado. Código: ${submissionCode}`, variant: 'success', durationMs: 6000 });
    } catch (e) {
      toastError(e);
    }
  }

  async function copy() {
    try {
      await submissionService.copyClipboard(data);
      pushToast({ message: 'Lista copiada al portapapeles', durationMs: 3000 });
    } catch (e) {
      toastError(e);
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
            <button type="button" class="btn btn-primary justify-start gap-3" disabled={!online} onClick={sendWeb}>
              🌐 Enviar por la web {!online && <span class="badge badge-sm">sin conexión</span>}
            </button>
            <button type="button" class="btn justify-start gap-3" onClick={() => submissionService.sendWhatsapp(data)}>
              💬 WhatsApp
            </button>
            <button type="button" class="btn justify-start gap-3" onClick={() => submissionService.downloadTxt(data)}>
              📄 Exportar a TXT
            </button>
            <button type="button" class="btn justify-start gap-3" onClick={copy}>
              📋 Copiar al portapapeles
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
