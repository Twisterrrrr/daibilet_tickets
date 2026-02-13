import { Controller, Get, Patch, Delete, Param, Body, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { AuditInterceptor } from './audit.interceptor';
import { ReviewService } from '../catalog/review.service';

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
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewService.adminList({
      status,
      eventId,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
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
