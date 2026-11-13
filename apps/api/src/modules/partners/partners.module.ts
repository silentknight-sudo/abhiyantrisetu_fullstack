import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { PartnersController } from './partners.controller';
import { PartnersService } from './partners.service';

@Module({
  imports: [StorageModule],
  controllers: [PartnersController, DocumentsController],
  providers: [PartnersService, DocumentsService],
  exports: [PartnersService],
})
export class PartnersModule {}
