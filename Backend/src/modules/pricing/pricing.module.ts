import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { PricingService } from './application/PricingService';
import { PriceRateRepository } from './domain/PriceRateRepository';
import { DrizzlePriceRateRepository } from './infrastructure/DrizzlePriceRateRepository';
import { PricingController } from './http/PricingController';

@Module({
  imports: [DatabaseModule],
  controllers: [PricingController],
  providers: [
    PricingService,
    { provide: PriceRateRepository, useClass: DrizzlePriceRateRepository },
  ],
  // Exporta el servicio: submission lo usa para calcular totales con la tarifa vigente.
  exports: [PricingService],
})
export class PricingModule {}
