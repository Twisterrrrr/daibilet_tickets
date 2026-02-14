import { Controller, Get, Post, UseGuards, UseInterceptors, Logger } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { AuditInterceptor } from './audit.interceptor';
import { QUEUE_SYNC, QUEUE_EMAILS } from '../queue/queue.constants';
import { TagAssignmentService } from '../scheduler/tag-assignment.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/ops')
export class AdminOpsController {
  private readonly logger = new Logger(AdminOpsController.name);

  constructor(
    @InjectQueue(QUEUE_SYNC) private readonly syncQueue: Queue,
    @InjectQueue(QUEUE_EMAILS) private readonly emailQueue: Queue,
    private readonly tagAssignment: TagAssignmentService,
  ) {}

  /**
   * Статус всех очередей BullMQ.
   */
  @Get('queues')
  @Roles('ADMIN')
  async getQueueStatus() {
    const [syncCounts, emailCounts] = await Promise.all([
      this.syncQueue.getJobCounts(),
      this.emailQueue.getJobCounts(),
    ]);

    return {
      sync: syncCounts,
      emails: emailCounts,
    };
  }

  /**
   * Подробная информация об очереди sync: последние завершённые и неудачные задачи.
   */
  @Get('queues/sync')
  @Roles('ADMIN')
  async getSyncQueueDetails() {
    const [counts, completed, failed, active] = await Promise.all([
      this.syncQueue.getJobCounts(),
      this.syncQueue.getCompleted(0, 10),
      this.syncQueue.getFailed(0, 10),
      this.syncQueue.getActive(0, 5),
    ]);

    return {
      counts,
      active: active.map((j) => ({
        id: j.id,
        name: j.name,
        attemptsMade: j.attemptsMade,
        processedOn: j.processedOn,
        timestamp: j.timestamp,
      })),
      completed: completed.map((j) => ({
        id: j.id,
        name: j.name,
        finishedOn: j.finishedOn,
        returnvalue: j.returnvalue,
      })),
      failed: failed.map((j) => ({
        id: j.id,
        name: j.name,
        failedReason: j.failedReason,
        attemptsMade: j.attemptsMade,
        finishedOn: j.finishedOn,
      })),
    };
  }

  /**
   * Ручной запуск пересчёта динамических тегов (best-value, last-minute, today-available).
   */
  @Post('dynamic-tags')
  @Roles('ADMIN')
  async runDynamicTags() {
    this.logger.log('Admin triggered dynamic tag assignment');
    const result = await this.tagAssignment.runManually();
    return {
      success: true,
      message: 'Динамические теги пересчитаны',
      ...result,
    };
  }
}
