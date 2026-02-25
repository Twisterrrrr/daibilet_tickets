import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailService } from '../mail/mail.service';
import { QUEUE_EMAILS } from './queue.constants';

export type EmailJobData =
  | { type: 'review-verify'; to: string; authorName: string; eventTitle: string; verifyUrl: string }
  | { type: 'review-request'; to: string; customerName: string; eventTitle: string; eventDate: string; reviewUrl: string }
  | { type: 'review-approved'; to: string; authorName: string; eventTitle: string; eventUrl: string }
  | { type: 'admin-new-review'; authorName: string; eventTitle: string; rating: number; text: string };

@Processor(QUEUE_EMAILS)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly mail: MailService) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    const data = job.data;
    this.logger.debug(`Processing email job: ${data.type} [${job.id}]`);

    switch (data.type) {
      case 'review-verify':
        await this.mail.sendReviewVerification(data.to, {
          authorName: data.authorName,
          eventTitle: data.eventTitle,
          verifyUrl: data.verifyUrl,
        });
        break;

      case 'review-request':
        await this.mail.sendReviewRequest(data.to, {
          customerName: data.customerName,
          eventTitle: data.eventTitle,
          eventDate: data.eventDate,
          reviewUrl: data.reviewUrl,
        });
        break;

      case 'review-approved':
        await this.mail.sendReviewApprovedNotification(data.to, {
          authorName: data.authorName,
          eventTitle: data.eventTitle,
          eventUrl: data.eventUrl,
        });
        break;

      case 'admin-new-review':
        await this.mail.notifyAdminNewReview({
          authorName: data.authorName,
          eventTitle: data.eventTitle,
          rating: data.rating,
          text: data.text,
        });
        break;

      default:
        this.logger.warn(`Unknown email job type: ${(data as any).type}`);
    }
  }
}
