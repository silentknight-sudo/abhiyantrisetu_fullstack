import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ManageController } from './manage.controller';
import { ManageService } from './manage.service';

@Module({
  controllers: [AdminController, ManageController],
  providers: [AdminService, ManageService],
})
export class AdminModule {}
