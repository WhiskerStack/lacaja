// Avatar dinámico determinista a partir de los datos del usuario (funcional §5.1).
// Usa DiceBear (estilo "initials"): inicial del usuario sobre un fondo de color
// determinista. El mismo usuario siempre genera el mismo avatar, sin peticiones de
// red (el SVG se construye en cliente).
import { createAvatar } from '@dicebear/core';
import { initials } from '@dicebear/collection';
import { UserDTO } from '@/features/common/domain/types';

/** Semilla estable: email > nombre completo > código > 'guest'. */
function avatarSeed(user: UserDTO | null): string {
  if (!user) return 'guest';
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return user.email || fullName || user.code || 'guest';
}

/** Data URI del avatar del usuario, listo para usar como `src` de un <img>. */
export function userAvatar(user: UserDTO | null): string {
  const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
  return createAvatar(initials, {
    // El texto de la inicial se toma del nombre; el color de fondo sale de la semilla.
    seed: fullName || avatarSeed(user),
    radius: 50,
  }).toDataUri();
}
