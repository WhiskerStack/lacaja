/** Campos editables de un cliente del sistema (code e id son inmutables). */
export interface UpdateUserInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
}
