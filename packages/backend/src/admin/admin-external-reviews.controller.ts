import {
  Controller, Get, Post, Delete, Param, Body, Query,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { AuditInterceptor } from './audit.interceptor';
import { ReviewService } from '../catalog/review.service';

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
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewService.listExternalReviews({
      eventId,
      source,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  async create(@Body() body: {
    eventId?: string;
    operatorId?: string;
    source: string;
    sourceUrl?: string;
    authorName: string;
    rating: number;
    text: string;
    publishedAt?: string;
  }) {
    return this.reviewService.createExternalReview(body);
  }

  @Post('batch')
  @Roles('ADMIN', 'EDITOR')
  async batchImport(@Body() body: {
    reviews: Array<{
      eventId?: string;
      operatorId?: string;
      source: string;
      sourceUrl?: string;
      authorName: string;
      rating: number;
      text: string;
      publishedAt?: string;
    }>;
  }) {
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
