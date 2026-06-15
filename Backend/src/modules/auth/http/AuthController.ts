import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../application/AuthService';
import { Public } from './decorators';
import { AdminLoginDto } from './auth.dto';

/** Login del panel admin. Throttled: frenar fuerza bruta en credenciales (stack §8). */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('admin/login')
  async adminLogin(@Body() dto: AdminLoginDto) {
    const { admin, token } = await this.auth.loginAdmin(dto.username, dto.password);
    return { admin: admin.toJSON(), ...token };
  }
}
