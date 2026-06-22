import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { CatalogService } from './application/CatalogService';
import { CatalogImportService } from './application/CatalogImportService';
import { AudiovisualRepository } from './domain/AudiovisualRepository';
import { CatalogMetadataRepository } from './domain/CatalogMetadataRepository';
import { DrizzleAudiovisualRepository } from './infrastructure/DrizzleAudiovisualRepository';
import { DrizzleCatalogMetadataRepository } from './infrastructure/DrizzleCatalogMetadataRepository';
import { CatalogExportService } from './infrastructure/CatalogExportService';
import { AdminCatalogController } from './http/AdminCatalogController';
import { CatalogController } from './http/CatalogController';

/** Composition root del catálogo: ata cada puerto a su adapter Drizzle (arquitectura §7.2). */
@Module({
  imports: [DatabaseModule],
  controllers: [CatalogController, AdminCatalogController],
  providers: [
    CatalogService,
    CatalogImportService,
    CatalogExportService,
    { provide: AudiovisualRepository, useClass: DrizzleAudiovisualRepository },
    { provide: CatalogMetadataRepository, useClass: DrizzleCatalogMetadataRepository },
  ],
  // Exporta el puerto y el servicio para que search/publish los reutilicen.
  exports: [CatalogService, AudiovisualRepository],
})
export class CatalogModule {}
