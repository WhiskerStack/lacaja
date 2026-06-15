import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { RequestsService } from './application/RequestsService';
import { ContentRequestRepository } from './domain/ContentRequestRepository';
import { DrizzleContentRequestRepository } from './infrastructure/DrizzleContentRequestRepository';
import { RequestsController } from './http/RequestsController';

@Module({
  imports: [DatabaseModule],
  controllers: [RequestsController],
  providers: [
    RequestsService,
    { provide: ContentRequestRepository, useClass: DrizzleContentRequestRepository },
  ],
})
export class RequestsModule {}
