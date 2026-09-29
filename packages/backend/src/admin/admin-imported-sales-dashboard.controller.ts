import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { AuditInterceptor } from './audit.interceptor';
import { AdminImportedSalesDashboardService } from './admin-imported-sales-dashboard.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/imported-sales')
export class AdminImportedSalesDashboardController {
  constructor(private readonly svc: AdminImportedSalesDashboardService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Thin read-model for Admin V4 dashboard (imported-sales)' })
  async getDashboard() {
    return this.svc.getDashboard();
  }
}

