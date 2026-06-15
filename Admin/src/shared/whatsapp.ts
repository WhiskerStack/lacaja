// Helpers para el aviso semiasistido por WhatsApp (funcional admin §6.2).

/** Limpia un teléfono dejando solo dígitos (formato internacional sin '+'). */
export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

/**
 * Construye el enlace wa.me con un mensaje prerellenado.
 * Devuelve null si no hay un teléfono utilizable.
 */
export function whatsappLink(phone: string | undefined, message: string): string | null {
  if (!phone) return null;
  const digits = normalizePhone(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** Mensaje sugerido para avisar de que una solicitud ya está disponible. */
export function availableMessage(name: string, searchText: string): string {
  const who = name.trim() ? `${name.trim()}, ` : '';
  return `Hola ${who}ya tenemos disponible "${searchText}" que solicitaste en Dahem. ¡Pásate cuando quieras!`;
}
