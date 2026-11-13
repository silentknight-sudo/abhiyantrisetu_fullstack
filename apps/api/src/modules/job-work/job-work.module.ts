import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { StorageModule } from '../storage/storage.module';
import { JobWorkController } from './job-work.controller';
import { JobWorkService } from './job-work.service';

@Module({
  imports: [JobsModule, StorageModule],
  controllers: [JobWorkController],
  providers: [JobWorkService],
})
export class JobWorkModule {}
