// Store del modo de búsqueda (arquitectura §3, especificaciones §4.1).
import { atom } from 'nanostores';
import type { SearchMode } from './types';

export const $searchMode = atom<SearchMode>('local');

export function setSearchMode(mode: SearchMode): void {
  $searchMode.set(mode);
}
