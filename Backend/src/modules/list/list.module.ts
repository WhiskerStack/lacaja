import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { ListService } from './application/ListService';
import { ListRepository } from './domain/ListRepository';
import { DrizzleListRepository } from './infrastructure/DrizzleListRepository';
import { ListController } from './http/ListController';

@Module({
  imports: [DatabaseModule],
  controllers: [ListController],
  providers: [
    ListService,
    { provide: ListRepository, useClass: DrizzleListRepository },
  ],
  exports: [ListService],
})
export class ListModule {}
