import { Body, Controller, Delete, Get, Param, Patch, Query, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { ReviewService } from '../catalog/review.service';
import { parsePagination } from '../common/pagination';
import { RejectSupplierResponseDto, ResolveDisputeDto } from './dto/admin-review-moderation.dto';
import { AuditInterceptor } from './audit.interceptor';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get('supplier-responses')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Список ответов поставщика на модерации' })
  async listSupplierResponses(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pg = parsePagination({ page, limit: limit || '20' });
    return this.reviewService.adminListSupplierResponses({ page: pg.page, limit: pg.limit });
  }

  @Patch('supplier-responses/:id/approve')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Одобрить ответ поставщика' })
  async approveSupplierResponse(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.reviewService.adminModerateSupplierResponse(id, 'approve', req.user.id);
  }

  @Patch('supplier-responses/:id/reject')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Отклонить ответ поставщика' })
  async rejectSupplierResponse(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
    @Body() body: RejectSupplierResponseDto,
  ) {
    return this.reviewService.adminModerateSupplierResponse(id, 'reject', req.user.id, body.moderationComment);
  }

  @Get('disputes')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Очередь оспариваний' })
  async listDisputes(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pg = parsePagination({ page, limit: limit || '20' });
    return this.reviewService.adminListDisputes({ page: pg.page, limit: pg.limit });
  }

  @Patch('disputes/:id/resolve')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Закрыть оспаривание' })
  async resolveDispute(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
    @Body() body: ResolveDisputeDto,
  ) {
    return this.reviewService.adminResolveDispute(id, req.user.id, body.status, body.decisionComment);
  }

  @Get()
  async list(
    @Query('status') status?: string,
    @Query('eventId') eventId?: string,
    @Query('lite') lite?: string,
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pg = parsePagination({ cursor, page, limit: limit || '20' });
    return this.reviewService.adminList({
      status,
      eventId,
      page: pg.page,
      limit: pg.limit,
      lite: lite === '1' || lite === 'true' || lite === 'yes',
    });
  }

  @Patch(':id/approve')
  @Roles('ADMIN', 'EDITOR')
  async approve(@Param('id') id: string) {
    return this.reviewService.adminModerate(id, 'approve');
  }

  @Patch(':id/reject')
  @Roles('ADMIN', 'EDITOR')
  async reject(@Param('id') id: string, @Body('adminComment') adminComment?: string) {
    return this.reviewService.adminModerate(id, 'reject', adminComment);
  }

  @Delete(':id')
  @Roles('ADMIN')
  async remove(@Param('id') id: string) {
    return this.reviewService.adminDelete(id);
  }
}
