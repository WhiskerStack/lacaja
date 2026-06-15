/**
 * Validación de presencia de variables de entorno (stack §8). Falla el arranque
 * temprano si falta una variable obligatoria, en vez de explotar más tarde en runtime.
 */
export interface EnvConfig {
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  PORT: number;
  LANDING_ORIGIN: string;
  ADMIN_ORIGIN: string;
  BUILD_COMMAND: string;
}

export function validateEnv(raw: Record<string, unknown>): EnvConfig {
  const required = ['DATABASE_URL', 'JWT_SECRET'] as const;
  const missing = required.filter((k) => !raw[k] || String(raw[k]).trim() === '');
  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno obligatorias: ${missing.join(', ')}. Revisa tu .env (ver .env.example).`,
    );
  }

  return {
    DATABASE_URL: String(raw.DATABASE_URL),
    JWT_SECRET: String(raw.JWT_SECRET),
    JWT_EXPIRES_IN: String(raw.JWT_EXPIRES_IN ?? '7d'),
    PORT: Number(raw.PORT ?? 3000),
    LANDING_ORIGIN: String(raw.LANDING_ORIGIN ?? 'http://localhost:4321'),
    ADMIN_ORIGIN: String(raw.ADMIN_ORIGIN ?? 'http://localhost:5173'),
    BUILD_COMMAND: String(raw.BUILD_COMMAND ?? 'echo "no BUILD_COMMAND configured"'),
  };
}
