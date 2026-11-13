import { Module } from '@nestjs/common';
import { MatchingModule } from '../matching/matching.module';
import { OpsController } from './ops.controller';
import { OpsService } from './ops.service';

@Module({ imports: [MatchingModule], controllers: [OpsController], providers: [OpsService] })
export class OpsModule {}
