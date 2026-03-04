import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { TeplohodWidgetsController } from './teplohod/teplohod-widgets.controller';
import { TeplohodWidgetsService } from './teplohod/teplohod-widgets.service';

@Module({
  imports: [PrismaModule],
  controllers: [TeplohodWidgetsController],
  providers: [TeplohodWidgetsService],
})
export class WidgetsModule {}

