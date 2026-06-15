// Acceso centralizado a la configuración de entorno expuesta al cliente.
// Las variables PUBLIC_* las inyecta Astro/Vite en build (import.meta.env).

export const API_URL: string =
  (import.meta.env.PUBLIC_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export const WHATSAPP_NUMBER: string =
  (import.meta.env.PUBLIC_WHATSAPP_NUMBER as string | undefined) ?? '';
