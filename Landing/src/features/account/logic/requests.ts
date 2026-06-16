// Registro de solicitudes de contenido no disponible (funcional §6.4.3). Requiere sesión y red.
import { API_URL } from '../../../shared/env';
import { apiFetch } from '../../../shared/http';

export async function requestContent(token: string, searchText: string): Promise<void> {
  if (!searchText.trim()) throw new Error('Escribe primero lo que buscas.');
  if (!API_URL) {
    // F1 sin backend: aceptamos optimistamente (se registra en F2).
    return;
  }
  await apiFetch(fetch, `${API_URL}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ searchText }),
  });
}
