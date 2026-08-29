/** Normaliza cualquier valor lanzado (HttpError, Error de red, etc.) a un mensaje para el usuario. */
export function messageFromError(err: unknown): string {
    if (err instanceof Error) {
        if (/failed to fetch|networkerror|load failed|aborted|timeout/i.test(err.message)) {
            return 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
        }
        return err.message;
    }
    if (typeof err === 'string' && err.trim()) return err.trim();
    return 'Ocurrió un error inesperado.';
}