// Modal de login/registro (funcional §4.3). Invocable desde navbar, envío por web y solicitar.
// No navega fuera de la vista. Ejecuta onSuccess (p.ej. reintentar el envío) al autenticarse.
import { useStore } from '@nanostores/preact';
import { useState } from 'preact/hooks';
import { $authModal, closeAuthModal } from '../store';
import { $online } from '../../../app/stores/network';
import { $session, clearSession, isLoggedIn, setSession } from '../../../app/stores/session';
import { accountService } from '../../../app/container';

export default function AuthModal() {
  const state = useStore($authModal);
  const session = useStore($session);
  const online = useStore($online);
  const [mode, setMode] = useState(state.mode);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', contact: '', password: '' });

  if (!state.open) return null;

  // Sesión iniciada: el icono abre esta vista para cerrar sesión (funcional §5.1).
  if (isLoggedIn(session) && session.user) {
    const { firstName, lastName } = session.user;
    return (
      <div class="modal modal-open">
        <div class="modal-box">
          <h3 class="text-lg font-bold">Tu cuenta</h3>
          <p class="mt-2 opacity-80">
            Sesión iniciada como <strong>{`${firstName} ${lastName}`.trim()}</strong>.
          </p>
          <div class="modal-action">
            <button type="button" class="btn btn-ghost" onClick={closeAuthModal}>Cerrar</button>
            <button
              type="button"
              class="btn btn-error"
              onClick={() => {
                clearSession();
                closeAuthModal();
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
        <div class="modal-backdrop" onClick={closeAuthModal} />
      </div>
    );
  }

  const set = (k: keyof typeof form) => (e: Event) =>
    setForm({ ...form, [k]: (e.target as HTMLInputElement).value });

  async function submit(e: Event) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result =
        mode === 'register'
          ? await accountService.register({
              firstName: form.firstName,
              lastName: form.lastName,
              password: form.password,
              email: form.email || undefined,
              phone: form.phone || undefined,
            })
          : await accountService.login({ contact: form.contact, password: form.password });
      setSession(result.user, result.token);
      const cb = state.onSuccess;
      closeAuthModal();
      cb?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div class="modal modal-open">
      <div class="modal-box">
        <h3 class="text-lg font-bold">{mode === 'register' ? 'Crear cuenta' : 'Iniciar sesión'}</h3>
        {state.reason && <p class="text-sm opacity-70 mt-1">Necesitas una cuenta {state.reason}.</p>}
        {!online && <div class="alert alert-warning text-sm mt-3">Sin conexión: esta acción requiere red.</div>}

        <form class="mt-4 space-y-3" onSubmit={submit}>
          {mode === 'register' ? (
            <>
              <input class="input input-bordered w-full" placeholder="Nombre" value={form.firstName} onInput={set('firstName')} />
              <input class="input input-bordered w-full" placeholder="Apellidos" value={form.lastName} onInput={set('lastName')} />
              <input class="input input-bordered w-full" type="email" placeholder="Correo (opcional si pones teléfono)" value={form.email} onInput={set('email')} />
              <input class="input input-bordered w-full" placeholder="Teléfono (opcional si pones correo)" value={form.phone} onInput={set('phone')} />
              <input class="input input-bordered w-full" type="password" placeholder="Contraseña (mínimo 6 caracteres)" value={form.password} onInput={set('password')} />
            </>
          ) : (
            <>
              <input class="input input-bordered w-full" placeholder="Correo o teléfono" value={form.contact} onInput={set('contact')} />
              <input class="input input-bordered w-full" type="password" placeholder="Contraseña" value={form.password} onInput={set('password')} />
            </>
          )}

          {error && <p class="text-error text-sm">{error}</p>}

          <button type="submit" class="btn btn-primary w-full" disabled={busy || !online}>
            {busy ? 'Procesando…' : mode === 'register' ? 'Registrarme' : 'Entrar'}
          </button>
        </form>

        <div class="text-sm text-center mt-3">
          {mode === 'register' ? (
            <button type="button" class="link" onClick={() => setMode('login')}>¿Ya tienes cuenta? Inicia sesión</button>
          ) : (
            <button type="button" class="link" onClick={() => setMode('register')}>¿No tienes cuenta? Regístrate</button>
          )}
        </div>

        <div class="modal-action">
          <button type="button" class="btn btn-ghost" onClick={closeAuthModal}>Cancelar</button>
        </div>
      </div>
      <div class="modal-backdrop" onClick={closeAuthModal} />
    </div>
  );
}
