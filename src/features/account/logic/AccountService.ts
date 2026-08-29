// AccountService: orquesta auth contra NestJS (especificaciones §2.2). Las reglas de validación
// del usuario viven en User (@dahem/domain). Si el backend no está accesible (offline), degrada
// con un modo local (sesión "optimista") para no bloquear el flujo; los errores del backend
// (credenciales/validación) SÍ se propagan.
import { User } from '@/features/users/domain/User';
import { extractApiError } from '../../../shared/http';
import type { AuthResult, LoginInput, RegisterInput } from '../types';
import { UserDTO } from '@/features/common/domain/types';

/** Respuesta cruda del backend de auth: el token viaja como `accessToken`. */
interface AuthApiResponse {
  user: UserDTO;
  accessToken: string;
}

export class AccountService {
  constructor(
    private readonly apiUrl: string,
    private readonly fetchFn: typeof fetch,
  ) {}

  /** Valida con la regla del dominio antes de tocar la red. */
  validateRegister(input: RegisterInput): string[] {
    const user = new User(input.firstName, input.lastName, input.email, input.phone);
    const errors = user.validate();
    if (input.password.length < 6) errors.push('La contraseña debe tener al menos 6 caracteres.');
    return errors;
  }

  async register(input: RegisterInput): Promise<AuthResult> {
    const errors = this.validateRegister(input);
    if (errors.length) throw new Error(errors.join(' '));
    return this.post(
      '/account/register',
      {
        firstName: input.firstName,
        lastName: input.lastName,
        password: input.password,
        email: input.email,
        phone: input.phone,
      },
      { firstName: input.firstName, lastName: input.lastName, email: input.email, phone: input.phone },
    );
  }

  async login(input: LoginInput): Promise<AuthResult> {
    if (!input.contact.trim()) throw new Error('Introduce tu correo o teléfono.');
    if (!input.password) throw new Error('Introduce tu contraseña.');
    const isEmail = input.contact.includes('@');
    return this.post(
      '/account/login',
      {
        password: input.password,
        email: isEmail ? input.contact : undefined,
        phone: isEmail ? undefined : input.contact,
      },
      {
        firstName: input.contact.split('@')[0] || 'Usuario',
        lastName: '',
        email: isEmail ? input.contact : undefined,
        phone: isEmail ? undefined : input.contact,
      },
    );
  }

  private async post(path: string, body: unknown, fallbackUser: UserDTO): Promise<AuthResult> {
    if (!this.apiUrl) return this.localFallback(fallbackUser);
    let res: Response;
    try {
      res = await this.fetchFn(`${this.apiUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      // Sin red / backend inalcanzable: sesión local optimista para no bloquear el MVP.
      return this.localFallback(fallbackUser);
    }
    if (!res.ok) {
      // El backend respondió un error (credenciales, validación, cuenta vetada): propágalo
      // con el detalle extraído del body para mostrarlo en pantalla.
      throw new Error(await extractApiError(res));
    }
    const data = (await res.json()) as AuthApiResponse;
    return { user: data.user, token: data.accessToken };
  }

  private localFallback(user: UserDTO): AuthResult {
    return { user, token: `local-${Date.now().toString(36)}` };
  }
}
