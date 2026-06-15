// Drawer "Mi lista" (funcional §7). Items con quitar+deshacer, totales, espacio disponible,
// y botón "Enviar lista" que abre el modal de envío. La hidratación viene de Dexie vía useList.
import { useStore } from '@nanostores/preact';
import { useState } from 'preact/hooks';
import { $drawerOpen, closeDrawer } from '../store';
import { useList, refreshList } from './useList';
import { listService } from '../../../app/container';
import { pushToast } from '../../../app/stores/toast';
import { openSubmissionModal } from '../../submission/store';
import { formatCup, formatGb } from '../../../shared/format';
import type { ListItemDTO } from '@daher/domain';

export default function Drawer() {
  const open = useStore($drawerOpen);
  const list = useList();
  const [spaceInput, setSpaceInput] = useState<string>('');

  const available = list?.availableSpaceGb ?? null;
  const total = list?.totalGb ?? 0;
  const overflow = available !== null ? Math.max(0, total - available) : 0;
  const fits = available === null ? null : total <= available;

  async function remove(item: ListItemDTO) {
    await listService.remove(item.code);
    await refreshList();
    // Toast con "Deshacer" durante ~7s (funcional §7.2).
    pushToast({
      message: `Quitado: ${item.name}`,
      actionLabel: 'Deshacer',
      durationMs: 7000,
      onAction: async () => {
        await listService.restore(item);
        await refreshList();
      },
    });
  }

  async function applySpace() {
    const n = spaceInput.trim() === '' ? null : Number(spaceInput);
    await listService.setAvailableSpace(n);
    await refreshList();
  }

  if (!open) return null;

  return (
    <div class="fixed inset-0 z-[60]" role="dialog" aria-label="Mi lista">
      {/* Overlay */}
      <div class="absolute inset-0 bg-black/50" onClick={closeDrawer} />
      {/* Panel lateral derecho */}
      <div class="absolute inset-y-0 right-0">
        <aside class="w-80 sm:w-96 h-full bg-base-200 flex flex-col shadow-2xl">
          <div class="flex items-center justify-between p-4 border-b border-base-300">
            <h2 class="text-lg font-bold">Mi lista</h2>
            <button type="button" class="btn btn-sm btn-circle btn-ghost" onClick={closeDrawer} aria-label="Cerrar">
              ✕
            </button>
          </div>

          {/* Items */}
          <div class="flex-1 overflow-y-auto p-3 space-y-2">
            {list === null && <div class="daher-skeleton h-20" />}
            {list && list.items.length === 0 && (
              <p class="text-sm opacity-70 text-center py-8">Tu lista está vacía. Explora el catálogo y agrega lo que quieras ver.</p>
            )}
            {list?.items.map((it) => (
              <div key={it.code} class="card card-compact bg-base-100">
                <div class="card-body flex-row items-center gap-3">
                  <div class="flex-1 min-w-0">
                    <p class="font-semibold truncate">{it.name}</p>
                    <p class="text-xs opacity-70 font-mono">{it.code}</p>
                    <p class="text-xs opacity-70">{formatGb(it.sizeGb)} · {formatCup(it.price)}</p>
                  </div>
                  <button type="button" class="btn btn-xs btn-ghost text-error" onClick={() => remove(it)}>
                    Quitar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Espacio disponible (funcional §7.3) */}
          <div class="p-3 border-t border-base-300 space-y-2">
            <label class="text-xs font-semibold opacity-80">Espacio disponible (GB)</label>
            <div class="join w-full">
              <input
                type="number"
                min="0"
                step="0.5"
                class="input input-sm input-bordered join-item w-full"
                placeholder={available !== null ? String(available) : 'ej. 16'}
                value={spaceInput}
                onInput={(e) => setSpaceInput((e.target as HTMLInputElement).value)}
              />
              <button type="button" class="btn btn-sm join-item" onClick={applySpace}>OK</button>
            </div>
            {fits !== null && (
              <p class={`text-xs ${fits ? 'text-success' : 'text-error'}`}>
                {fits ? `Cabe (sobran ${formatGb(available! - total)})` : `Se pasa por ${formatGb(overflow)}`}
              </p>
            )}
          </div>

          {/* Totales + enviar (funcional §7.2, §7.4) */}
          <div class="p-4 border-t border-base-300 space-y-3 bg-base-300/40">
            <div class="flex justify-between text-sm">
              <span>Total</span>
              <span class="font-bold">{formatGb(total)} · {formatCup(list?.totalPrice ?? 0)}</span>
            </div>
            <button
              type="button"
              class="btn btn-primary w-full"
              disabled={!list || list.items.length === 0}
              onClick={() => openSubmissionModal()}
            >
              Enviar lista
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
