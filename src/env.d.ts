/// <reference types="astro/client" />
/// <reference types="@vite-pwa/astro/client" />

// `virtual:pwa-register` lo sirve vite-plugin-pwa en tiempo de build (en dev es un no-op). Se
// declara aquí porque el paquete es una dependencia transitiva de @vite-pwa/astro y sus tipos
// (vite-plugin-pwa/client) no son resolubles desde la raíz del proyecto con pnpm.
declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    /** Registra al importar en vez de esperar al evento `load`. */
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
    onRegisteredSW?: (swScriptUrl: string, registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: unknown) => void;
  }
  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>;
}

// `lite-youtube-embed` no trae tipos: registra el custom element <lite-youtube> por efecto.
declare module 'lite-youtube-embed';

// Shims mínimos de `node:*` para los tests que leen el catálogo desde disco
// (catalog-contract.test.ts). La app es SSG y no usa `node:*` en runtime, así que
// evitamos instalar @types/node solo para tipar este import en TypeScript.
// Si en el futuro se necesita más superficie, se amplía este bloque.
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: BufferEncoding): string;
  export function readFileSync(path: string): Buffer;
}
declare module 'node:path' {
  export function resolve(...paths: string[]): string;
  export function dirname(path: string): string;
}
declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string;
}
