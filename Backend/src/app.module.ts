import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AppConfigModule } from './shared/config/config.module';
import { DatabaseModule } from './shared/database/database.module';
import { AllExceptionsFilter } from './shared/http/AllExceptionsFilter';
import { AccountModule } from './modules/account/account.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { ListModule } from './modules/list/list.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { PublishModule } from './modules/publish/publish.module';
import { RequestsModule } from './modules/requests/requests.module';
import { SearchModule } from './modules/search/search.module';
import { SubmissionModule } from './modules/submission/submission.module';

/** Módulo raíz: transversales (config, BD, logger, throttler, cron, auth) + módulos de dominio. */
@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    LoggerModule.forRoot({
      pinoHttp: {
        // Logs legibles en dev; JSON estructurado en prod (stack §8).
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    ScheduleModule.forRoot(),

    // Auth es @Global y debe cargarse antes que los módulos que usan sus puertos/servicios.
    AuthModule,

    // Módulos de dominio (la raíz grita el negocio).
    CatalogModule,
    SearchModule,
    AccountModule,
    ListModule,
    RequestsModule,
    SubmissionModule,
    PricingModule,
    AdminModule,
    PublishModule,
  ],
  providers: [
    // Throttler global (afinado por ruta con @Throttle en endpoints sensibles).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
