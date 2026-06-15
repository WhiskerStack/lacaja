import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { SearchProvider } from '../catalog/domain/SearchProvider';
import { SearchService } from './application/SearchService';
import { PostgresSearchProvider } from './infrastructure/PostgresSearchProvider';
import { SearchController } from './http/SearchController';

/**
 * Composition root de la búsqueda: ata SearchProvider → PostgresSearchProvider.
 * El día que se migre a Meilisearch sólo cambia este binding (búsqueda §4.2).
 */
@Module({
  imports: [DatabaseModule],
  controllers: [SearchController],
  providers: [
    SearchService,
    { provide: SearchProvider, useClass: PostgresSearchProvider },
  ],
  exports: [SearchService],
})
export class SearchModule {}
