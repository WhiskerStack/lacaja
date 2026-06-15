import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { PricingModule } from '../pricing/pricing.module';
import { SubmissionService } from './application/SubmissionService';
import { WebSubmissionRepository } from './domain/WebSubmissionRepository';
import { DrizzleWebSubmissionRepository } from './infrastructure/DrizzleWebSubmissionRepository';
import { SubmissionController } from './http/SubmissionController';

/** Importa PricingModule para calcular totales con la tarifa vigente (PriceRate). */
@Module({
  imports: [DatabaseModule, PricingModule],
  controllers: [SubmissionController],
  providers: [
    SubmissionService,
    { provide: WebSubmissionRepository, useClass: DrizzleWebSubmissionRepository },
  ],
})
export class SubmissionModule {}
