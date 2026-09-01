// Helper de navegación compartido por el navbar y la botonera inferior: decide qué
// enlace corresponde a la página actual para resaltarlo (funcional §5.2).

/** Quita la barra final salvo en la raíz, para que "/buscar/" y "/buscar" coincidan. */
function normalize(path: string): string {
  return path !== '/' && path.endsWith('/') ? path.slice(0, -1) : path;
}

/**
 * ¿El enlace `href` apunta a la página que se está viendo?
 * La raíz exige coincidencia exacta; el resto acepta subrutas ("/biblioteca/x").
 */
export function isActivePath(href: string, pathname: string): boolean {
  const current = normalize(pathname);
  const target = normalize(href);
  return target === '/' ? current === '/' : current === target || current.startsWith(`${target}/`);
}
