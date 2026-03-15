import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MulterModule } from '@nestjs/platform-express';

import { OperatorScopeGuard } from '../common/guards/operator-scope.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { ReviewCapabilityService } from '../review/review-capability.service';
import { SupplierLedgerService } from '../ledger/supplier-ledger.service';
import { SupplierDisputeService } from '../supplier-finance/supplier-dispute.service';
import { SupplierReconciliationService } from '../supplier-finance/supplier-reconciliation.service';
import { SupplierFinanceSummaryService } from '../supplier-finance/supplier-finance-summary.service';
import { ReportsModule } from '../reports/reports.module';
import { CatalogModule } from '../catalog/catalog.module';
import { SupplierRbacService } from './supplier-rbac.service';
import { SupplierRolesGuard } from './supplier.guard';
import { SupplierAuthService } from './supplier-auth.service';
import { SupplierController } from './supplier.controller';
import { SupplierJwtStrategy } from './supplier-jwt.strategy';
import { SupplierReviewsService } from './supplier-reviews.service';
import { SupplierTrustService } from './supplier-trust.service';
import { SupplierNotificationsService } from './supplier-notifications.service';
import { SupplierUploadController } from './supplier-upload.controller';
import { SupplierTrustJob } from './supplier-trust.job';
import { SupplierIntegrationsService } from './supplier-integrations.service';
import { SupplierInvitationService } from './supplier-invitation.service';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({ limits: { fileSize: 25 * 1024 * 1024 } }),
    PassportModule,
    ReportsModule,
    CatalogModule,
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
    SupplierTrustService,
    SupplierNotificationsService,
    SupplierTrustJob,
    SupplierIntegrationsService,
    SupplierInvitationService,
    SupplierLedgerService,
    SupplierDisputeService,
    SupplierReconciliationService,
    SupplierFinanceSummaryService,
    ReviewCapabilityService,
    OperatorScopeGuard,
    SupplierRolesGuard,
  ],
  controllers: [SupplierController, SupplierUploadController],
  exports: [
    SupplierAuthService,
    SupplierRbacService,
    SupplierTrustService,
    SupplierLedgerService,
    SupplierDisputeService,
    SupplierReconciliationService,
    SupplierFinanceSummaryService,
  ],
})
export class SupplierModule {}
