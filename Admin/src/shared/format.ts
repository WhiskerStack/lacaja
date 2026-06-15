// Utilidades de formato sin dueño (precio CUP, peso GB, fechas). Sin React ni HTTP.

/** Formatea un precio en pesos cubanos (CUP). */
export function formatCup(value: number): string {
  return new Intl.NumberFormat('es-CU', {
    style: 'currency',
    currency: 'CUP',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Formatea un peso en gigabytes con una decimal cuando aporta. */
export function formatGb(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded} GB`;
}

/** Formatea una fecha ISO a una fecha legible en español. */
export function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('es-CU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

/** Etiqueta legible para el tipo de audiovisual. */
export function audiovisualTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    movie: 'Película',
    series: 'Serie',
    telenovela: 'Telenovela',
    show: 'Show',
    anime: 'Anime',
  };
  return labels[type] ?? type;
}

/** Etiqueta legible para el estado de una solicitud. */
export function requestStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    available: 'Disponible',
    notified: 'Avisado',
  };
  return labels[status] ?? status;
}
