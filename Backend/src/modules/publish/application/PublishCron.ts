import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PublishService } from './PublishService';

/**
 * Cron de madrugada (02:00): regenera el SSG sólo si el catálogo cambió desde el último
 * build (publish §7). El chequeo de "cambió" está stubbeado con una comparación de timestamp
 * en PublishService; en producción se ataría a un updated_at del catálogo.
 */
@Injectable()
export class PublishCron {
  private readonly logger = new Logger(PublishCron.name);

  constructor(private readonly publish: PublishService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async nightlyRebuild(): Promise<void> {
    // Stub: si hay cambios pendientes desde el último build correcto, publica.
    if (!this.publish.hasChangesSince(Date.now())) {
      this.logger.log('Cron 02:00 — sin cambios en el catálogo; no se reconstruye.');
      return;
    }
    this.logger.log('Cron 02:00 — cambios detectados; disparando publicación.');
    await this.publish.publish('cron');
  }
}
