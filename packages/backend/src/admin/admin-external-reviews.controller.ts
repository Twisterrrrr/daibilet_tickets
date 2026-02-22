import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { ReviewService } from '../catalog/review.service';
import { parsePagination } from '../common/pagination';
import { AuditInterceptor } from './audit.interceptor';
import { BatchExternalReviewsDto, CreateExternalReviewDto } from './dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/external-reviews')
export class AdminExternalReviewsController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  async list(
    @Query('eventId') eventId?: string,
    @Query('source') source?: string,
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pg = parsePagination({ cursor, page, limit: limit || '20' });
    return this.reviewService.listExternalReviews({
      eventId,
      source,
      page: pg.page,
      limit: pg.limit,
    });
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  async create(@Body() body: CreateExternalReviewDto) {
    return this.reviewService.createExternalReview(body);
  }

  @Post('batch')
  @Roles('ADMIN', 'EDITOR')
  async batchImport(@Body() body: BatchExternalReviewsDto) {
    const results = [];
    for (const item of body.reviews) {
      const review = await this.reviewService.createExternalReview(item);
      results.push(review);
    }
    return { imported: results.length, reviews: results };
  }

  @Delete(':id')
  @Roles('ADMIN')
  async remove(@Param('id') id: string) {
    return this.reviewService.deleteExternalReview(id);
  }
}
