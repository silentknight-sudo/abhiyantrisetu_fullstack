import { Module } from '@nestjs/common';
import { RequirementsModule } from '../requirements/requirements.module';
import { MatchingService } from './matching.service';

@Module({ imports: [RequirementsModule], providers: [MatchingService], exports: [MatchingService] })
export class MatchingModule {}
