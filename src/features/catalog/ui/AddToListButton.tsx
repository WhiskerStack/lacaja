// Isla del botón "Agregar a Mi lista" (funcional §6.2.2). Para episódico, genera el código
// según el nivel (§6.3.1): S1122 / S1122-3 / S1122-3-10. Las reglas de código/precio vienen
// del dominio; aquí solo se construye el snapshot y se llama al servicio.
import { useState } from 'preact/hooks';
import { listService } from '../../../app/container';
import { refreshList, useList } from '../../my-list/ui/useList';
import { priceFor } from '../logic/pricing';
import { pushToast } from '../../../app/stores/toast';
import { AudiovisualType, ItemLevel } from '@/features/common/domain/types';

interface Props {
  code: string;
  level: ItemLevel;
  targetId: number;
  name: string;
  sizeGb: number;
  type: AudiovisualType;
  isPremiere: boolean;
  /** Nº de capítulos que cubre lo agregado (1 para películas/capítulos sueltos). */
  units?: number;
  /** Etiqueta opcional para variantes (temporada/capítulo). */
  label?: string;
  block?: boolean;
}

export default function AddToListButton(props: Props) {
  const list = useList();
  const [busy, setBusy] = useState(false);
  const inList = list?.items.some((i) => i.code === props.code) ?? false;

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      if (inList) {
        await listService.remove(props.code);
        await refreshList();
      } else {
        await listService.add({
          code: props.code,
          level: props.level,
          targetId: props.targetId,
          name: props.name,
          sizeGb: props.sizeGb,
          price: priceFor(props.type, props.isPremiere, props.units ?? 1),
        });
        await refreshList();
        pushToast({ message: `Agregado: ${props.name}`, durationMs: 3000 });
      }
    } finally {
      setBusy(false);
    }
  }

  const cls = [
    'btn gap-2',
    props.block ? 'w-full' : '',
    inList ? 'btn-outline btn-success' : 'btn-primary',
  ].join(' ');

  return (
    <button type="button" class={cls} disabled={busy} onClick={toggle} aria-pressed={inList}>
      {inList ? '✓ En Mi lista' : (props.label ?? 'Agregar a Mi lista')}
      <span class="badge badge-sm font-mono">{props.code}</span>
    </button>
  );
}
