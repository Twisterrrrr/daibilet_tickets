import { Controller, Get, Param, Post, Query, Request, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { AuditInterceptor } from './audit.interceptor';
import { FailedJobsService, QUEUE_NAMES } from './failed-jobs.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/jobs')
export class AdminJobsController {
  constructor(private readonly failedJobs: FailedJobsService) {}

  /**
   * Список failed jobs с фильтром по очереди.
   */
  @Get('failed')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Список провалившихся jobs (sync, fulfillment, emails, …)' })
  @ApiQuery({ name: 'queue', required: false, description: 'Фильтр по queue name' })
  @ApiQuery({ name: 'start', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getFailed(@Query('queue') queue?: string, @Query('start') start?: string, @Query('limit') limit?: string) {
    const startNum = start ? parseInt(start, 10) : 0;
    const limitNum = limit ? Math.min(parseInt(limit, 10) || 50, 100) : 50;

    const validQueue = queue && QUEUE_NAMES.includes(queue as any) ? queue : undefined;
    return this.failedJobs.getFailedJobs(validQueue, startNum, limitNum);
  }

  /**
   * Retry провалившегося job. Аудит: кто нажал.
   */
  @Post('failed/:queue/:jobId/retry')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Повторить failed job' })
  async retry(@Param('queue') queue: string, @Param('jobId') jobId: string, @Request() req: { user: { id: string } }) {
    return this.failedJobs.retryJob(queue, jobId, req.user.id);
  }
}
