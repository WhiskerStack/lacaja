// Store del slice my-list: espejo reactivo del estado de la lista para el badge del navbar
// y el drawer (arquitectura §3: solo estado, sin reglas). La fuente de verdad es Dexie.
import { atom } from 'nanostores';
import type { ListSnapshot } from './types';

/**
 * null = aún no hidratado desde Dexie. La UI usa esto para mostrar un placeholder neutro
 * en el badge en vez de "0" (especificaciones §8.4: evitar el flash del contador).
 */
export const $list = atom<ListSnapshot | null>(null);

export function setListSnapshot(snapshot: ListSnapshot): void {
  $list.set(snapshot);
}

/** Apertura del drawer "Mi lista", invocable desde el navbar y la botonera inferior. */
export const $drawerOpen = atom<boolean>(false);

export function openDrawer(): void {
  $drawerOpen.set(true);
}
export function closeDrawer(): void {
  $drawerOpen.set(false);
}
