import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Operador del panel admin (modelo de datos ADMIN_USER). Tabla aislada, sin roles.
// password_hash nunca en texto plano (se hashea con argon2; stack §6).
export const adminUsers = pgTable('admin_user', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
