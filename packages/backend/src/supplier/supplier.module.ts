import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MulterModule } from '@nestjs/platform-express';

import { OperatorScopeGuard } from '../common/guards/operator-scope.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { ReviewCapabilityService } from '../review/review-capability.service';
import { SupplierRbacService } from './supplier-rbac.service';
import { SupplierRolesGuard } from './supplier.guard';
import { SupplierAuthService } from './supplier-auth.service';
import { SupplierController } from './supplier.controller';
import { SupplierJwtStrategy } from './supplier-jwt.strategy';
import { SupplierReviewsService } from './supplier-reviews.service';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({ limits: { fileSize: 25 * 1024 * 1024 } }),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  providers: [
    SupplierJwtStrategy,
    SupplierAuthService,
    SupplierRbacService,
    SupplierReviewsService,
    ReviewCapabilityService,
    OperatorScopeGuard,
    SupplierRolesGuard,
  ],
  controllers: [SupplierController],
  exports: [SupplierAuthService, SupplierRbacService],
})
export class SupplierModule {}
