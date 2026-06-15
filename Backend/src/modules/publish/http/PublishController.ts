import { Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdminOnly } from '../../auth/http/decorators';
import { PublishService } from '../application/PublishService';

/** Disparo manual de la regeneración del SSG. Sólo admin y con rate limit (build costoso). */
@AdminOnly()
@Controller('admin/publish')
export class PublishController {
  constructor(private readonly service: PublishService) {}

  @Throttle({ default: { limit: 2, ttl: 60_000 } })
  @Post()
  async publish() {
    return this.service.publish('manual');
  }

  @Get('status')
  async status() {
    return this.service.status();
  }
}
