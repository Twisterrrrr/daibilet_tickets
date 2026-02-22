import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { PublicFeatureFlagsController } from './public-feature-flags.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PublicFeatureFlagsController],
})
export class PublicModule {}
