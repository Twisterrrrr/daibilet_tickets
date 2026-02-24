import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { OperatorScopeGuard } from '../common/guards/operator-scope.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { SupplierRolesGuard } from './supplier.guard';
import { SupplierAuthService } from './supplier-auth.service';
import { SupplierController } from './supplier.controller';
import { SupplierJwtStrategy } from './supplier-jwt.strategy';

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
  providers: [SupplierJwtStrategy, SupplierAuthService, SupplierRolesGuard, OperatorScopeGuard],
  controllers: [SupplierController],
  exports: [SupplierAuthService],
})
export class SupplierModule {}
