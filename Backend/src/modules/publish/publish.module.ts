import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { PublishCron } from './application/PublishCron';
import { PublishService } from './application/PublishService';
import { PublishController } from './http/PublishController';

@Module({
  imports: [DatabaseModule],
  controllers: [PublishController],
  providers: [PublishService, PublishCron],
  exports: [PublishService],
})
export class PublishModule {}
