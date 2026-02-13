import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly enabled: boolean;
  private readonly appUrl: string;
  private readonly adminEmail: string;

  constructor(
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
  ) {
    this.enabled = !!this.config.get('SMTP_HOST');
    this.appUrl = this.config.get('APP_URL', 'http://localhost:3000');
    this.adminEmail = this.config.get('ADMIN_EMAIL', 'admin@daibilet.ru');

    if (!this.enabled) {
      this.logger.warn('SMTP не настроен — email-отправка отключена');
    }
  }

  /**
   * Отправить письмо верификации отзыва.
   */
  async sendReviewVerification(to: string, data: {
    authorName: string;
    eventTitle: string;
    verifyUrl: string;
  }): Promise<boolean> {
    if (!this.enabled) {
      this.logger.warn(`[DRY RUN] Review verify → ${to}: ${data.verifyUrl}`);
      return false;
    }

    try {
      await this.mailer.sendMail({
        to,
        subject: `Подтвердите отзыв — ${data.eventTitle}`,
        template: 'review-verify',
        context: {
          authorName: data.authorName,
          eventTitle: data.eventTitle,
          verifyUrl: data.verifyUrl,
          appUrl: this.appUrl,
        },
      });
      this.logger.log(`Review verify email sent → ${to}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send verify email to ${to}: ${err.message}`);
      return false;
    }
  }

  /**
   * Отправить запрос на отзыв после посещения.
   */
  async sendReviewRequest(to: string, data: {
    customerName: string;
    eventTitle: string;
    eventDate: string;
    reviewUrl: string;
  }): Promise<boolean> {
    if (!this.enabled) {
      this.logger.warn(`[DRY RUN] Review request → ${to}: ${data.reviewUrl}`);
      return false;
    }

    try {
      await this.mailer.sendMail({
        to,
        subject: `Как вам ${data.eventTitle}? Оставьте отзыв!`,
        template: 'review-request',
        context: {
          customerName: data.customerName,
          eventTitle: data.eventTitle,
          eventDate: data.eventDate,
          reviewUrl: data.reviewUrl,
          appUrl: this.appUrl,
        },
      });
      this.logger.log(`Review request email sent → ${to}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send review request to ${to}: ${err.message}`);
      return false;
    }
  }

  /**
   * Уведомить админа о новом отзыве на модерации.
   */
  async sendReviewApprovedNotification(to: string, data: {
    authorName: string;
    eventTitle: string;
    eventUrl: string;
  }): Promise<boolean> {
    if (!this.enabled) {
      this.logger.warn(`[DRY RUN] Review approved → ${to}`);
      return false;
    }

    try {
      await this.mailer.sendMail({
        to,
        subject: `Ваш отзыв опубликован — ${data.eventTitle}`,
        template: 'review-approved',
        context: {
          authorName: data.authorName,
          eventTitle: data.eventTitle,
          eventUrl: data.eventUrl,
          appUrl: this.appUrl,
        },
      });
      this.logger.log(`Review approved notification sent → ${to}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send approved email to ${to}: ${err.message}`);
      return false;
    }
  }

  /**
   * Уведомить администратора о новом отзыве.
   */
  async notifyAdminNewReview(data: {
    authorName: string;
    eventTitle: string;
    rating: number;
    text: string;
  }): Promise<void> {
    if (!this.enabled) {
      this.logger.warn(`[DRY RUN] Admin notification: new review from ${data.authorName}`);
      return;
    }

    try {
      await this.mailer.sendMail({
        to: this.adminEmail,
        subject: `Новый отзыв: ${data.eventTitle} (${data.rating}/5)`,
        html: `
          <h3>Новый отзыв ожидает модерации</h3>
          <p><b>Событие:</b> ${data.eventTitle}</p>
          <p><b>Автор:</b> ${data.authorName}</p>
          <p><b>Рейтинг:</b> ${'★'.repeat(data.rating)}${'☆'.repeat(5 - data.rating)}</p>
          <p><b>Текст:</b> ${data.text.substring(0, 300)}${data.text.length > 300 ? '...' : ''}</p>
          <p><a href="${this.appUrl}/admin/reviews">Модерировать →</a></p>
        `,
      });
    } catch (err: any) {
      this.logger.error(`Failed to notify admin: ${err.message}`);
    }
  }
}
