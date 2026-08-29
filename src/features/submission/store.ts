// Store del modal de envío (funcional §7.4).
import { atom } from 'nanostores';

export const $submissionOpen = atom<boolean>(false);

export function openSubmissionModal(): void {
  $submissionOpen.set(true);
}
export function closeSubmissionModal(): void {
  $submissionOpen.set(false);
}
