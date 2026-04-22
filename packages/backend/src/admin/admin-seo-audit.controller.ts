import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import type { SeoAuditEventsParams } from './seo-audit/seo-audit.service';
import { SeoAuditService } from './seo-audit/seo-audit.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/seo-audit')
export class AdminSeoAuditController {
  constructor(private readonly seoAudit: SeoAuditService) {}

  @Get('summary')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  @ApiOkResponse({ description: 'Unified SEO audit summary (soft, on-the-fly)' })
  getSummary() {
    return this.seoAudit.getUnifiedSummary();
  }

  @Get('issues')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  @ApiOkResponse({ description: 'Unified SEO audit issues list (soft, on-the-fly)' })
  getIssues(
    @Query('entityType') entityType?: string,
    @Query('severity') severity?: string,
    @Query('issueCode') issueCode?: string,
    @Query('search') search?: string,
    @Query('cityId') cityId?: string,
    @Query('onlyIssues') onlyIssues?: 'true' | 'false',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.seoAudit.getUnifiedIssues({
      entityType,
      severity,
      issueCode,
      search,
      cityId,
      onlyIssues,
      page,
      limit,
    });
  }

  @Get('entity/:entityType/:entityId')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  @ApiOkResponse({ description: 'Unified SEO audit issues for entity (soft, on-the-fly)' })
  getEntityIssues(@Param('entityType') entityType: string, @Param('entityId') entityId: string) {
    return this.seoAudit.getUnifiedEntityIssues({ entityType, entityId });
  }

  @Get('events')
  @Roles('ADMIN', 'EDITOR')
  @ApiOkResponse({ description: 'SEO audit for events (on-the-fly)' })
  getEventsAudit(
    @Query('search') search?: string,
    @Query('cityId') cityId?: string,
    @Query('source') source?: string,
    @Query('isActive') isActive?: 'true' | 'false',
    @Query('hasFutureSessions') hasFutureSessions?: 'true' | 'false',
    @Query('onlyIssues') onlyIssues?: 'true' | 'false',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const params: SeoAuditEventsParams = {
      search,
      cityId,
      source,
      isActive,
      hasFutureSessions,
      onlyIssues,
      page,
      limit,
    };
    return this.seoAudit.getEventsAudit(params);
  }

  @Get('cities')
  @Roles('ADMIN', 'EDITOR')
  @ApiOkResponse({ description: 'SEO audit for cities (Gate 3)' })
  getCitiesAudit(
    @Query('onlyIssues') onlyIssues?: 'true' | 'false',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.seoAudit.getCitiesAudit({ onlyIssues, page, limit });
  }

  @Get('venues')
  @Roles('ADMIN', 'EDITOR')
  @ApiOkResponse({ description: 'SEO audit for venues (Gate 3)' })
  getVenuesAudit(
    @Query('cityId') cityId?: string,
    @Query('onlyIssues') onlyIssues?: 'true' | 'false',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.seoAudit.getVenuesAudit({ cityId, onlyIssues, page, limit });
  }
}
