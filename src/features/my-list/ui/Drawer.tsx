// src/features/my-list/ui/Drawer.tsx
import { useStore } from '@nanostores/preact';
import { useState } from 'preact/hooks';
import { $drawerOpen, closeDrawer } from '../store';
import { useList, refreshList } from './useList';
import { listService } from '../../../app/container';
import { pushToast } from '../../../app/stores/toast';
import { openSubmissionModal } from '../../submission/store';
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

  return (
    // Contenedor principal: siempre presente, controlamos opacidad y eventos
    <div
      class={`fixed inset-0 z-[60] transition-opacity duration-300 ease-in-out ${
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      role="dialog"
      aria-label="Mi lista"
    >
      {/* Overlay con fade */}
      <div class="absolute inset-0 bg-black/50" onClick={closeDrawer} />

      {/* Panel lateral que se desliza desde la derecha */}
      <div
        class={`absolute inset-y-0 right-0 transition-transform duration-300 ease-in-out transform ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <aside class="w-80 sm:w-96 h-full bg-base-200 flex flex-col shadow-2xl">
          {/* Cabecera */}
          <div class="flex items-center justify-between p-4 border-b border-base-300">
            <h2 class="text-lg font-bold">Mi lista</h2>
            <button
              type="button"
              class="btn btn-sm btn-circle btn-ghost"
              onClick={closeDrawer}
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>

          {/* Items */}
          <div class="flex-1 overflow-y-auto p-3 space-y-2">
            {list === null && <div class="dahem-skeleton h-20" />}
            {list && list.items.length === 0 && (
              <p class="text-sm opacity-70 text-center py-8">
                Tu lista está vacía. Explora el catálogo y agrega lo que quieras ver.
              </p>
            )}
            {list?.items.map((it) => (
              <div key={it.code} class="card card-compact bg-base-100">
                <div class="card-body flex-row items-center gap-3">
                  <div class="flex-1 min-w-0">
                    <p class="font-semibold truncate">{it.name}</p>
                    <p class="text-xs opacity-70 font-mono">{it.code}</p>
                  </div>
                  <button
                    type="button"
                    class="btn btn-xs btn-ghost text-error"
                    onClick={() => remove(it)}
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Botón de enviar */}
          <div class="p-4 border-t border-base-300 bg-base-300/40">
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