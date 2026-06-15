// AccountService: orquesta auth contra NestJS (especificaciones §2.2). Las reglas de validación
// del usuario viven en User (@dahem/domain). F1: el backend puede no existir; degrada con un
// modo local (sesión "optimista") para no bloquear el flujo del MVP.
import { User, type UserDTO } from '@dahem/domain';
import type { AuthResult, LoginInput, RegisterInput } from '../types';

export class AccountService {
  constructor(
    private readonly apiUrl: string,
    private readonly fetchFn: typeof fetch,
  ) {}

  /** Valida con la regla del dominio antes de tocar la red. */
  validateRegister(input: RegisterInput): string[] {
    const user = new User(input.firstName, input.lastName, input.email, input.phone);
    return user.validate();
  }

  async register(input: RegisterInput): Promise<AuthResult> {
    const errors = this.validateRegister(input);
    if (errors.length) throw new Error(errors.join(' '));
    return this.post('/auth/register', input, {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
    });
  }

  async login(input: LoginInput): Promise<AuthResult> {
    if (!input.contact.trim()) throw new Error('Introduce tu correo o teléfono.');
    const isEmail = input.contact.includes('@');
    return this.post('/auth/login', input, {
      firstName: input.contact.split('@')[0] || 'Usuario',
      lastName: '',
      email: isEmail ? input.contact : undefined,
      phone: isEmail ? undefined : input.contact,
    });
  }

  private async post(path: string, body: unknown, fallbackUser: UserDTO): Promise<AuthResult> {
    if (!this.apiUrl) return this.localFallback(fallbackUser);
    try {
      const res = await this.fetchFn(`${this.apiUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`auth ${res.status}`);
      return (await res.json()) as AuthResult;
    } catch {
      // F1 / offline: sesión local optimista (no se persiste en backend hasta F2).
      return this.localFallback(fallbackUser);
    }
  }

  private localFallback(user: UserDTO): AuthResult {
    return { user, token: `local-${Date.now().toString(36)}` };
  }
}
