import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { CatalogConsistencyService } from '../catalog/catalog-consistency.service';
import { CatalogGuardService } from '../catalog/catalog-guard.service';
import { CatalogAuditService } from '../catalog/catalog-audit.service';
import {
  ADMIN_CATALOG_CONSISTENCY_COMPUTE_METRIC,
  OperationLatencyTrackerService,
} from '../common/operation-latency-tracker.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/catalog')
export class AdminCatalogConsistencyController {
  constructor(
    private readonly catalogConsistency: CatalogConsistencyService,
    private readonly catalogGuard: CatalogGuardService,
    private readonly catalogAudit: CatalogAuditService,
    private readonly latency: OperationLatencyTrackerService,
  ) {}

  @Get('consistency')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  @ApiOperation({ summary: 'Согласованность каталога: подкатегории, качество, пустые подборки/лендинги' })
  async getConsistency(@Query('refresh') refresh?: string) {
    const bust = refresh === '1' || refresh === 'true';
    return this.latency.track(ADMIN_CATALOG_CONSISTENCY_COMPUTE_METRIC, () =>
      this.catalogConsistency.getSnapshot({ refresh: bust }),
    );
  }

  @Get('consistency/report')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  @ApiOperation({
    summary: 'Sellability: total / sellable / % / breakdown по причинам (catalog guard)',
  })
  async getSellabilityReport() {
    return this.catalogGuard.getSellabilityReport();
  }

  @Get('audit')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  @ApiOperation({
    summary:
      'Аудит каталога (read-only): missingCategory/taxonomy, location, offers, sessions, coverage по городам',
  })
  async getCatalogAudit() {
    return this.catalogAudit.getAudit();
  }
}
