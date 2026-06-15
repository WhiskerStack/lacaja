import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../../auth/application/AuthService';
import { Public } from '../../auth/http/decorators';
import { UserLoginDto, UserRegisterDto } from '../../auth/http/auth.dto';

/** Cuenta ligera del cliente USER (landing): registro y login. Throttled (stack §8). */
@Controller('account')
export class AccountController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  async register(@Body() dto: UserRegisterDto) {
    const { user, token } = await this.auth.registerUser(
      dto.firstName,
      dto.lastName,
      dto.password,
      dto.email,
      dto.phone,
    );
    return { user: user.toJSON(), ...token };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  async login(@Body() dto: UserLoginDto) {
    const { user, token } = await this.auth.loginUser(dto.password, dto.email, dto.phone);
    return { user: user.toJSON(), ...token };
  }
}
