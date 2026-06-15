// Helpers de formato sin reglas de dominio (arquitectura §2: shared/ son utilidades puras).

/** Formatea un precio en CUP (funcional §8.2). */
export function formatCup(value: number): string {
  return `${Math.round(value).toLocaleString('es-CU')} CUP`;
}

/** Formatea un peso en GB con una decimal cuando aporta. */
export function formatGb(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0$/, '');
  return `${text} GB`;
}

/** Duración en minutos a "1h 26m". */
export function formatDuration(minutes?: number): string {
  if (!minutes || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Rating a una decimal: 8.1. */
export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

/** Trunca un texto a n caracteres con sufijo (funcional §6.1.1 / §6.2.2). */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}
