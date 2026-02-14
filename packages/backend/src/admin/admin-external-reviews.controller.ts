import {
  Controller, Get, Post, Delete, Param, Body, Query,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { AuditInterceptor } from './audit.interceptor';
import { ReviewService } from '../catalog/review.service';
import { CreateExternalReviewDto, BatchExternalReviewsDto } from './dto/admin.dto';
import { parsePagination } from '../common/pagination';

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
