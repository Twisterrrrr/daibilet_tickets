import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { PrismaModule } from '../prisma/prisma.module';
import { SupplierRolesGuard } from './supplier.guard';
import { SupplierAuthController } from './supplier-auth.controller';
import { SupplierAuthService } from './supplier-auth.service';
import { SupplierDashboardController } from './supplier-dashboard.controller';
import { SupplierEventsController } from './supplier-events.controller';
import { SupplierJwtStrategy } from './supplier-jwt.strategy';
import { SupplierReportsController } from './supplier-reports.controller';
import { SupplierSettingsController } from './supplier-settings.controller';

@Module({
  imports: [
    PrismaModule,
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
  providers: [SupplierJwtStrategy, SupplierAuthService, SupplierRolesGuard],
  controllers: [
    SupplierAuthController,
    SupplierEventsController,
    SupplierDashboardController,
    SupplierReportsController,
    SupplierSettingsController,
  ],
  exports: [SupplierAuthService],
})
export class SupplierModule {}
