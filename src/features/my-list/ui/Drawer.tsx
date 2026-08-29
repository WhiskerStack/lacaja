// Drawer "Mi lista" (funcional §7). Items con quitar+deshacer, totales,
// y botón "Enviar lista". Ya no se muestra el peso.
import { useStore } from '@nanostores/preact';
import { useState } from 'preact/hooks';
import { $drawerOpen, closeDrawer } from '../store';
import { useList, refreshList } from './useList';
import { listService } from '../../../app/container';
import { pushToast } from '../../../app/stores/toast';
import { openSubmissionModal } from '../../submission/store';
import { formatCup } from '../../../shared/format';
import { ListItemDTO } from '../types';

export default function Drawer() {
  const open = useStore($drawerOpen);
  const list = useList();

  async function remove(item: ListItemDTO) {
    await listService.remove(item.code);
    await refreshList();
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

  if (!open) return null;

  return (
    <div class="fixed inset-0 z-[60]" role="dialog" aria-label="Mi lista">
      <div class="absolute inset-0 bg-black/50" onClick={closeDrawer} />
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
            {list === null && <div class="dahem-skeleton h-20" />}
            {list && list.items.length === 0 && (
              <p class="text-sm opacity-70 text-center py-8">Tu lista está vacía. Explora el catálogo y agrega lo que quieras ver.</p>
            )}
            {list?.items.map((it) => (
              <div key={it.code} class="card card-compact bg-base-100">
                <div class="card-body flex-row items-center gap-3">
                  <div class="flex-1 min-w-0">
                    <p class="font-semibold truncate">{it.name}</p>
                    <p class="text-xs opacity-70 font-mono">{it.code}</p>
                    <p class="text-xs opacity-70">{formatCup(it.price)}</p>
                  </div>
                  <button type="button" class="btn btn-xs btn-ghost text-error" onClick={() => remove(it)}>
                    Quitar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Totales (solo precio) */}
          <div class="p-4 border-t border-base-300 space-y-3 bg-base-300/40">
            <div class="flex justify-between text-sm">
              <span>Total</span>
              <span class="font-bold">{formatCup(list?.totalPrice ?? 0)}</span>
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