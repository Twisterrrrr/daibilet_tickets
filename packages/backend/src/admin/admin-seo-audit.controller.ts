import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
}
