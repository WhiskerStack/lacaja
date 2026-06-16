import { boolean, pgTable, serial, text } from 'drizzle-orm/pg-core';

// Cliente final del landing (modelo de datos USER). Cuenta ligera: al menos email o phone.
// "user" es palabra reservada en Postgres, por eso el nombre de tabla va entre comillas.
export const users = pgTable('user', {
  id: serial('id').primaryKey(),
  // Código autogenerado e inmutable: U{id} (p. ej. U123). Se materializa tras el insert.
  code: text('code').notNull().default(''),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  // Cliente vetado: el login del landing lo rechaza.
  banned: boolean('banned').notNull().default(false),
  // Hash de credencial para la sesión ligera del cliente (account/login). Opcional para
  // cuentas creadas solo desde envíos, pero el flujo register/login lo usa.
  passwordHash: text('password_hash'),
});
