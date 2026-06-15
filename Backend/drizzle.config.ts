import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit lee TODO el esquema desde el barrel de shared/database/schema.ts
// (que reexporta cada *.schema.ts de los módulos). Una sola DATABASE_URL a Postgres.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/shared/database/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/dahem',
  },
  verbose: true,
  strict: true,
});
