import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { PartnersModule } from '../partners/partners.module';
import { ProsModule } from '../pros/pros.module';
import { QuotesModule } from '../quotes/quotes.module';
import { RequirementsModule } from '../requirements/requirements.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [RequirementsModule, QuotesModule, JobsModule, PartnersModule, ProsModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
