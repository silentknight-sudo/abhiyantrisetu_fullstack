import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { PartnersModule } from '../partners/partners.module';
import { RequirementsModule } from '../requirements/requirements.module';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';

@Module({
  imports: [PartnersModule, RequirementsModule, JobsModule],
  controllers: [QuotesController],
  providers: [QuotesService],
})
export class QuotesModule {}
