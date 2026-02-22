import { Module } from '@nestjs/common';

import { ComboController } from './combo.controller';
import { ComboService } from './combo.service';

@Module({
  controllers: [ComboController],
  providers: [ComboService],
  exports: [ComboService],
})
export class ComboModule {}
