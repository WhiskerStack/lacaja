import type { UserDTO } from '../../common/domain/types';

/** Cliente final del landing. Cuenta ligera: solo para enviar la lista por web. */
export class User {
  constructor(
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly email?: string,
    public readonly phone?: string,
    public readonly id?: number,
    /** Código autogenerado e inmutable (U{id}); lo asigna el backend al crear. */
    public readonly code?: string,
    /** Cliente vetado: no puede iniciar sesión. */
    public readonly banned: boolean = false,
  ) {}

  fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  /** Regla de negocio (funcional §4.2): al menos una vía de contacto. */
  validate(): string[] {
    const errors: string[] = [];
    if (!this.firstName.trim()) errors.push('El nombre es obligatorio.');
    if (!this.lastName.trim()) errors.push('Los apellidos son obligatorios.');
    if (!this.email?.trim() && !this.phone?.trim())
      errors.push('Se requiere al menos un correo o un teléfono.');
    return errors;
  }

  static fromJSON(d: UserDTO): User {
    return new User(d.firstName, d.lastName, d.email, d.phone, d.id, d.code, d.banned ?? false);
  }

  toJSON(): UserDTO {
    return {
      id: this.id,
      code: this.code,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      phone: this.phone,
      banned: this.banned,
    };
  }
}
