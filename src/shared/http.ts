// Captura centralizada de errores HTTP. Un único lugar que sabe cómo extraer un mensaje
// legible del cuerpo de la respuesta (formato de error de NestJS) para mostrarlo luego en
// un toast con detalle. Lo usan todos los servicios que hablan con el backend.

/** Error de una llamada al backend ya normalizado a un mensaje legible. status 0 = sin red. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * Saca el mensaje legible de un cuerpo de error. Soporta el formato plano de NestJS
 * (`message: string | string[]`) y el envuelto por filtros de excepción que anidan otro
 * error dentro de `message` (`message: { message, error, statusCode }`): baja recursivamente.
 */
function messageFromBody(body: unknown, depth = 0): string | null {
  if (typeof body === 'string') return body.trim() || null;
  if (Array.isArray(body)) {
    const parts = body.map((m) => messageFromBody(m, depth + 1)).filter(Boolean);
    if (parts.length) return parts.join(' ');
    return null;
  }
  if (!body || typeof body !== 'object' || depth > 4) return null;
  const obj = body as Record<string, unknown>;
  for (const key of ['message', 'error', 'detail'] as const) {
    if (key in obj) {
      const msg = messageFromBody(obj[key], depth + 1);
      if (msg) return msg;
    }
  }
  return null;
}

/**
 * Lee el cuerpo de una respuesta de error UNA sola vez y devuelve el mensaje más detallado
 * posible: el `message` del JSON de NestJS → texto plano acotado → status + statusText.
 */
export async function extractApiError(res: Response): Promise<string> {
  let raw = '';
  try {
    raw = await res.text();
  } catch {
    /* cuerpo ilegible */
  }
  if (raw) {
    try {
      const fromJson = messageFromBody(JSON.parse(raw));
      if (fromJson) return fromJson;
    } catch {
      // No era JSON (HTML de un proxy, texto del servidor…): úsalo acotado.
      const text = raw.trim();
      if (text && !text.startsWith('<')) return text.slice(0, 300);
    }
  }
  const status = `${res.status}${res.statusText ? ` ${res.statusText}` : ''}`.trim();
  return `No se pudo completar la solicitud (${status || res.status}).`;
}

/** Normaliza cualquier valor lanzado (HttpError, Error de red, etc.) a un mensaje para el usuario. */
export function messageFromError(err: unknown): string {
  if (err instanceof HttpError) return err.message;
  if (err instanceof Error) {
    if (/failed to fetch|networkerror|load failed|aborted|timeout/i.test(err.message)) {
      return 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
    }
    return err.message;
  }
  if (typeof err === 'string' && err.trim()) return err.trim();
  return 'Ocurrió un error inesperado.';
}

/**
 * fetch envuelto: ejecuta la petición y, si el backend responde con error, lanza un HttpError
 * con el mensaje ya extraído del body. Los errores de red se convierten en HttpError(status 0).
 * Devuelve la Response (ya verificada como ok) para que el llamador parsee el cuerpo de éxito.
 */
export async function apiFetch(
  fetchFn: typeof fetch,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  let res: Response;
  try {
    res = await fetchFn(input, init);
  } catch (e) {
    throw new HttpError(0, messageFromError(e));
  }
  if (!res.ok) {
    throw new HttpError(res.status, await extractApiError(res), undefined);
  }
  return res;
}
