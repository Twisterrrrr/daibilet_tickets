import { Controller, Get, Patch, Delete, Param, Body, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { AuditInterceptor } from './audit.interceptor';
import { ReviewService } from '../catalog/review.service';
import { parsePagination } from '../common/pagination';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  async list(
    @Query('status') status?: string,
    @Query('eventId') eventId?: string,
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
