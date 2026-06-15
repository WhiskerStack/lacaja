import { AdminUser, User } from '@dahem/domain';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from '../../account/domain/UserRepository';
import { AdminUserRepository } from '../../admin/domain/AdminUserRepository';
import { AuthAudience, JwtPayload } from '../http/auth.constants';
import { PasswordHasher } from './PasswordHasher';

export interface AuthToken {
  accessToken: string;
}

/**
 * Emite y valida los dos públicos de auth (stack §6): admin (panel) y cliente USER (landing).
 * argon2 para hashear; @nestjs/jwt para el token. Bootstrap del primer admin sólo si no hay ninguno.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly hasher: PasswordHasher,
    private readonly admins: AdminUserRepository,
    private readonly users: UserRepository,
  ) {}

  // --- Admin (panel) ---

  /** Crea el primer admin SOLO si la tabla está vacía (bootstrap del panel). */
  async bootstrapAdmin(
    username: string,
    password: string,
    displayName: string,
  ): Promise<{ admin: AdminUser; token: AuthToken }> {
    const existing = await this.admins.count();
    if (existing > 0) {
      throw new ConflictException('El bootstrap ya se realizó: ya existe al menos un administrador.');
    }
    return this.createAdmin(username, password, displayName);
  }

  /** Alta de un admin desde dentro (ya autenticado como admin). */
  async createAdmin(
    username: string,
    password: string,
    displayName: string,
  ): Promise<{ admin: AdminUser; token: AuthToken }> {
    const candidate = new AdminUser(username, displayName);
    const errors = candidate.validate();
    if (errors.length) throw new BadRequestException(errors.join(' '));
    if (password.length < 8)
      throw new BadRequestException('La contraseña debe tener al menos 8 caracteres.');
    if (await this.admins.findByUsername(username))
      throw new ConflictException('El usuario ya existe.');

    const passwordHash = await this.hasher.hash(password);
    const admin = await this.admins.create(username, passwordHash, displayName);
    return { admin, token: this.sign(admin.id!, 'admin', username) };
  }

  async loginAdmin(username: string, password: string): Promise<{ admin: AdminUser; token: AuthToken }> {
    const record = await this.admins.findByUsername(username);
    if (!record || !(await this.hasher.verify(record.passwordHash, password))) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }
    return { admin: record.user, token: this.sign(record.user.id!, 'admin', username) };
  }

  // --- Cliente (landing) ---

  async registerUser(
    firstName: string,
    lastName: string,
    password: string,
    email?: string,
    phone?: string,
  ): Promise<{ user: User; token: AuthToken }> {
    const candidate = new User(firstName, lastName, email, phone);
    const errors = candidate.validate();
    if (errors.length) throw new BadRequestException(errors.join(' '));
    if (password.length < 6)
      throw new BadRequestException('La contraseña debe tener al menos 6 caracteres.');
    if (await this.users.findByContact(email, phone))
      throw new ConflictException('Ya existe una cuenta con ese contacto.');

    const passwordHash = await this.hasher.hash(password);
    const user = await this.users.create(candidate, passwordHash);
    return { user, token: this.sign(user.id!, 'user') };
  }

  async loginUser(password: string, email?: string, phone?: string): Promise<{ user: User; token: AuthToken }> {
    const record = await this.users.findByContact(email, phone);
    if (!record || !record.passwordHash || !(await this.hasher.verify(record.passwordHash, password))) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }
    return { user: record.user, token: this.sign(record.user.id!, 'user') };
  }

  private sign(sub: number, aud: AuthAudience, username?: string): AuthToken {
    const payload: JwtPayload = { sub, aud, username };
    return { accessToken: this.jwt.sign(payload) };
  }
}
