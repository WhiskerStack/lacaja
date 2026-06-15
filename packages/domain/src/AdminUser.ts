import type { AdminUserDTO } from './types';

/**
 * Operador del panel admin (modelo de datos ADMIN_USER). Tabla aislada, sin relación con USER.
 * No hay roles: toda cuenta tiene los mismos permisos. password_hash nunca viaja en el DTO.
 */
export class AdminUser {
  constructor(
    public readonly username: string,
    public readonly displayName: string,
    public readonly id?: number,
    public readonly createdAt?: string,
  ) {}

  validate(): string[] {
    const errors: string[] = [];
    if (!this.username.trim()) errors.push('El usuario es obligatorio.');
    if (this.username.length < 3) errors.push('El usuario debe tener al menos 3 caracteres.');
    if (!this.displayName.trim()) errors.push('El nombre visible es obligatorio.');
    return errors;
  }

  static fromJSON(d: AdminUserDTO): AdminUser {
    return new AdminUser(d.username, d.displayName, d.id, d.createdAt);
  }

  toJSON(): AdminUserDTO {
    return {
      id: this.id,
      username: this.username,
      displayName: this.displayName,
      createdAt: this.createdAt,
    };
  }
}
