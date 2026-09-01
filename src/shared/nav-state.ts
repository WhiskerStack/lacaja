// Estado de navegación por entrada del historial: hace que "atrás" devuelva al usuario al mismo
// sitio donde estaba (scroll vertical, carruseles y paginación del scroll infinito).
//
// Cómo funciona: al cargar una página se sella la entrada del historial con una clave (`dhKey`)
// vía replaceState, y el estado volátil se guarda en sessionStorage bajo esa clave. Al navegar a
// una página nueva la entrada es nueva → clave nueva → sin snapshot → arranque limpio. Al volver
// atrás el navegador restaura el history.state de esa entrada → misma clave → se restaura todo.
// Los filtros de las vistas de listado viven en la URL (replaceState, no pushState) para que el
// back devuelva la vista filtrada sin haber creado una entrada por cada clic.

export interface NavSnapshot {
  /** Scroll vertical del documento. */
  scrollY?: number;
  /** Nº de tarjetas cargadas por el scroll infinito. */
  shown?: number;
  /** Panel de filtros abierto/cerrado. */
  filtersOpen?: boolean;
  /** scrollLeft de cada carril horizontal, por índice. */
  rails?: Record<string, number>;
  /** Marca de tiempo, solo para poder purgar las entradas más viejas. */
  ts?: number;
}

const PREFIX = 'dahem:nav:';
const MAX_ENTRIES = 40;

function randomKey(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** Clave de esta entrada del historial; la crea (replaceState) la primera vez. */
export function historyKey(): string {
  const state = (history.state ?? {}) as Record<string, unknown>;
  if (typeof state.dhKey === 'string') return state.dhKey;
  const key = randomKey();
  try {
    history.replaceState({ ...state, dhKey: key }, '');
  } catch {
    /* Safari puede limitar replaceState; sin clave simplemente no se restaura nada. */
  }
  return key;
}

export function readSnapshot(): NavSnapshot {
  try {
    const raw = sessionStorage.getItem(PREFIX + historyKey());
    return raw ? (JSON.parse(raw) as NavSnapshot) : {};
  } catch {
    return {};
  }
}

export function patchSnapshot(patch: NavSnapshot): void {
  try {
    const next = { ...readSnapshot(), ...patch, ts: Date.now() };
    sessionStorage.setItem(PREFIX + historyKey(), JSON.stringify(next));
    prune();
  } catch {
    /* sessionStorage lleno o bloqueado: la restauración es un extra, nunca un error visible. */
  }
}

/** Deja como mucho MAX_ENTRIES snapshots, descartando los más antiguos. */
function prune(): void {
  const keys: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    if (k?.startsWith(PREFIX)) keys.push(k);
  }
  if (keys.length <= MAX_ENTRIES) return;
  const withTs = keys.map((k) => {
    let ts = 0;
    try {
      ts = (JSON.parse(sessionStorage.getItem(k) ?? '{}') as NavSnapshot).ts ?? 0;
    } catch {
      /* entrada corrupta: ts 0 → se purga primero */
    }
    return { k, ts };
  });
  withTs
    .sort((a, b) => a.ts - b.ts)
    .slice(0, withTs.length - MAX_ENTRIES)
    .forEach(({ k }) => sessionStorage.removeItem(k));
}

/** Cambia la URL sin crear entrada de historial y conservando la clave de la actual. */
export function replaceUrl(url: string): void {
  try {
    history.replaceState({ ...(history.state ?? {}), dhKey: historyKey() }, '', url);
  } catch {
    /* ignorado: la URL es una comodidad, el snapshot ya cubre la restauración */
  }
}

/**
 * Vuelve atrás dentro del sitio. Si se llegó por un enlace compartido o desde fuera (no hay
 * referrer del propio origen), history.back() sacaría al usuario de la app: en ese caso navega
 * al destino de respaldo (el nivel superior de la ficha).
 */
export function goBack(fallback = '/'): void {
  let internal = false;
  try {
    internal = Boolean(document.referrer) && new URL(document.referrer).origin === location.origin;
  } catch {
    internal = false;
  }
  if (internal && history.length > 1) {
    history.back();
    return;
  }
  location.href = fallback;
}

/**
 * Tope de la restauración. Es generoso a propósito: en /biblioteca y /buscar la altura del
 * documento solo existe cuando la isla ya pintó, y en un móvil lento eso tarda. El bucle se corta
 * antes en cuanto llega a la posición o el usuario toca la pantalla.
 */
const RESTORE_TIMEOUT_MS = 6000;

/**
 * Instala el guardado/restauración de scroll. Se llama una vez por carga de página desde el
 * layout base. La restauración reintenta por frames porque en /biblioteca y /buscar el contenido
 * lo pinta una isla después de hidratar: en el primer frame el documento aún no tiene altura.
 */
export function installNavRestore(): void {
  if (typeof window === 'undefined') return;
  const w = window as Window & { __dahemNavRestore?: boolean };
  if (w.__dahemNavRestore) return;
  w.__dahemNavRestore = true;

  // Nosotros restauramos: si no, el navegador salta al scroll viejo con el documento aún corto.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  const snapshot = readSnapshot();
  const railsOf = () => Array.from(document.querySelectorAll<HTMLElement>('.dahem-rail'));

  const write = (): void => {
    const rails: Record<string, number> = {};
    railsOf().forEach((el, i) => {
      if (el.scrollLeft > 0) rails[String(i)] = el.scrollLeft;
    });
    patchSnapshot({ scrollY: window.scrollY, rails });
  };

  let queued = false;
  const save = (): void => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      write();
    });
  };
  // En captura para oír también el scroll horizontal de los carriles (no burbujea).
  document.addEventListener('scroll', save, { capture: true, passive: true });
  // Al abandonar la página el guardado va sin rAF: durante el unload ya no hay más frames.
  window.addEventListener('pagehide', write);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') write();
  });

  const targetY = snapshot.scrollY ?? 0;
  const targetRails = snapshot.rails ?? {};
  if (targetY <= 0 && Object.keys(targetRails).length === 0) return;

  // Si el usuario toca la página, mandan sus dedos, no la restauración.
  const USER_EVENTS = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
  let done = false;
  const stop = (): void => {
    done = true;
    USER_EVENTS.forEach((t) => window.removeEventListener(t, stop));
  };
  USER_EVENTS.forEach((t) => window.addEventListener(t, stop, { passive: true }));

  const deadline = performance.now() + RESTORE_TIMEOUT_MS;
  const step = (): void => {
    if (done) return;
    railsOf().forEach((el, i) => {
      const left = targetRails[String(i)];
      if (left && Math.abs(el.scrollLeft - left) > 1) el.scrollLeft = left;
    });
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    if (targetY > 0) window.scrollTo(0, Math.min(targetY, max));
    const arrived = targetY <= 0 || Math.abs(window.scrollY - targetY) <= 2;
    if ((arrived && max >= targetY) || performance.now() > deadline) {
      stop();
      return;
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
