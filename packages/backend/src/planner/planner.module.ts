import { Module } from '@nestjs/common';

import { CatalogModule } from '../catalog/catalog.module';
import { PlannerController } from './planner.controller';
import { PlannerService } from './planner.service';

@Module({
  imports: [CatalogModule],
  controllers: [PlannerController],
  providers: [PlannerService],
  exports: [PlannerService],
})
export class PlannerModule {}
