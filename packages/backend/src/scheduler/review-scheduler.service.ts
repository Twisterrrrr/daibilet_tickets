import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';
import { QUEUE_EMAILS, QUEUE_REVIEW_TASKS } from '../queue/queue.constants';
import { EmailJobData } from '../queue/email.processor';
import { ReviewTaskData } from '../queue/review-task.processor';

/**
 * Review Scheduler — автоматические задачи по отзывам.
 *
 * - 10:00 — отправка запросов на отзыв покупателям (post-purchase)
 * - 10:00 (воскресенье) — повторное напоминание (7 дней после первого)
 * - 04:00 — очистка неподтверждённых отзывов (TTL 48 часов)
 */
@Injectable()
export class ReviewSchedulerService {
  private readonly logger = new Logger(ReviewSchedulerService.name);
  private readonly appUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue(QUEUE_EMAILS) private readonly emailQueue: Queue<EmailJobData>,
    @InjectQueue(QUEUE_REVIEW_TASKS) private readonly reviewQueue: Queue<ReviewTaskData>,
  ) {
    this.appUrl = this.config.get('APP_URL', 'http://localhost:3000');
  }

  /**
   * Ежедневно в 10:00 — отправить запросы на отзыв.
   * Ищем Package + PackageItem, где:
   * - Событие было вчера (дата сессии < now - 1 день)
   * - Ещё нет ReviewRequest для этого email + eventId
   * - Package.status = PAID или FULFILLED
   */
  @Cron('0 0 10 * * *', { name: 'send-review-requests' })
  async handleSendReviewRequests() {
    this.logger.log('=== CRON: Отправка запросов на отзывы ===');

    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

      // Найти завершённые сессии (прошли 1-2 дня назад)
      const recentItems = await this.prisma.packageItem.findMany({
        where: {
          package: {
            status: { in: ['PAID', 'FULFILLED', 'PARTIALLY_FULFILLED'] },
          },
          session: {
            startsAt: { gte: twoDaysAgo, lt: oneDayAgo },
          },
        },
        include: {
          package: { select: { email: true, customerName: true } },
          event: { select: { id: true, title: true, slug: true } },
          session: { select: { startsAt: true } },
        },
      });

      let sent = 0;
      for (const item of recentItems) {
        // Проверить что нет ReviewRequest
        const existing = await this.prisma.reviewRequest.findUnique({
          where: {
            email_eventId: {
              email: item.package.email.toLowerCase(),
              eventId: item.eventId,
            },
          },
        });

        if (existing) continue;

        // Создать ReviewRequest
        const token = randomBytes(32).toString('hex');
        await this.prisma.reviewRequest.create({
          data: {
            email: item.package.email.toLowerCase(),
            eventId: item.eventId,
            token,
          },
        });

        // Отправить email через очередь
        const reviewUrl = `${this.appUrl}/reviews/write?token=${token}`;
        const eventDate = item.session.startsAt.toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

        await this.emailQueue.add('review-request', {
          type: 'review-request',
          to: item.package.email,
          customerName: item.package.customerName,
          eventTitle: item.event.title,
          eventDate,
          reviewUrl,
        });

        sent++;
      }

      if (sent > 0) {
        this.logger.log(`Отправлено ${sent} запросов на отзывы`);
      }
    } catch (err: unknown) {
      this.logger.error(`Ошибка отправки запросов на отзывы: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * По воскресеньям в 10:00 — повторное напоминание.
   * Для ReviewRequest, у которых:
   * - sentAt > 7 дней назад
   * - reminderSentAt = null
   * - reviewId = null (отзыв не оставлен)
   */
  @Cron('0 0 10 * * 0', { name: 'send-review-reminders' })
  async handleSendReminders() {
    this.logger.log('=== CRON: Повторные напоминания об отзывах ===');

    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const pending = await this.prisma.reviewRequest.findMany({
        where: {
          sentAt: { lt: sevenDaysAgo },
          reminderSentAt: null,
          reviewId: null,
        },
        include: {
          event: { select: { id: true, title: true, slug: true } },
        },
        take: 100, // batch
      });

      let sent = 0;
      for (const req of pending) {
        const reviewUrl = `${this.appUrl}/reviews/write?token=${req.token}`;

        await this.emailQueue.add('review-request', {
          type: 'review-request',
          to: req.email,
          customerName: req.email.split('@')[0], // fallback
          eventTitle: req.event.title,
          eventDate: req.sentAt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }),
          reviewUrl,
        });

        await this.prisma.reviewRequest.update({
          where: { id: req.id },
          data: { reminderSentAt: new Date() },
        });

        sent++;
      }

      if (sent > 0) {
        this.logger.log(`Отправлено ${sent} повторных напоминаний`);
      }
    } catch (err: unknown) {
      this.logger.error(`Ошибка отправки напоминаний: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Ежедневно в 04:00 — очистка неподтверждённых отзывов (PENDING_EMAIL > 48h).
   */
  @Cron('0 0 4 * * *', { name: 'cleanup-unverified-reviews' })
  async handleCleanupUnverified() {
    this.logger.log('=== CRON: Очистка неподтверждённых отзывов ===');

    try {
      await this.reviewQueue.add('cleanup-expired-tokens', {
        type: 'cleanup-expired-tokens',
      });
    } catch (err: unknown) {
      this.logger.error(`Ошибка очистки: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
