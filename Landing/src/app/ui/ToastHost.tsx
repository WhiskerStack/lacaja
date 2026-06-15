// Host de toasts: se monta una vez (en Base layout) y pinta la cola del store.
import { useStore } from '@nanostores/preact';
import { $toasts, dismissToast } from '../stores/toast';

export default function ToastHost() {
  const toasts = useStore($toasts);
  return (
    <div class="toast toast-end toast-bottom z-[100]">
      {toasts.map((t) => (
        <div key={t.id} class="alert alert-info shadow-lg max-w-xs">
          <span class="text-sm">{t.message}</span>
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
