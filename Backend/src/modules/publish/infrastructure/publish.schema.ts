import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Registro de ejecuciones de publicación del SSG (publish §7). Auditable.
export const publishRuns = pgTable('publish_run', {
  id: serial('id').primaryKey(),
  status: text('status').notNull(), // 'running' | 'success' | 'failed'
  trigger: text('trigger').notNull(), // 'manual' | 'cron'
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  log: text('log'),
});
