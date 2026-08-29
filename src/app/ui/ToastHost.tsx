// Host de toasts: se monta una vez (en Base layout) y pinta la cola del store.
import { useStore } from '@nanostores/preact';
import { $toasts, dismissToast, type ToastVariant } from '../stores/toast';

const VARIANT_CLASS: Record<ToastVariant, string> = {
  info: 'alert-info',
  success: 'alert-success',
  error: 'alert-error',
  warning: 'alert-warning',
};

export default function ToastHost() {
  const toasts = useStore($toasts);
  return (
    <div class="toast toast-end toast-bottom z-[9999]">
      {toasts.map((t) => (
        <div key={t.id} class={`alert ${VARIANT_CLASS[t.variant]} shadow-lg max-w-xs`}>
          <span class="text-sm whitespace-pre-line">{t.message}</span>
          {t.actionLabel && (
            <button
              type="button"
              class="btn btn-xs btn-ghost"
              onClick={() => {
                t.onAction?.();
                dismissToast(t.id);
              }}
            >
              {t.actionLabel}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
