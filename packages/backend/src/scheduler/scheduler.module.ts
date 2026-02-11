import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { CatalogModule } from '../catalog/catalog.module';
import { ComboModule } from '../combo/combo.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CatalogModule,
    ComboModule,
  ],
  providers: [SchedulerService],
})
export class SchedulerModule {}
