import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';

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
  async sendReviewVerification(
    to: string,
    data: {
      authorName: string;
      eventTitle: string;
      verifyUrl: string;
    },
  ): Promise<boolean> {
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
    } catch (err: unknown) {
      this.logger.error(`Failed to send verify email to ${to}: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  /**
   * Отправить запрос на отзыв после посещения.
   */
  async sendReviewRequest(
    to: string,
    data: {
      customerName: string;
      eventTitle: string;
      eventDate: string;
      reviewUrl: string;
    },
  ): Promise<boolean> {
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
    } catch (err: unknown) {
      this.logger.error(`Failed to send review request to ${to}: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  /**
   * Уведомить админа о новом отзыве на модерации.
   */
  async sendReviewApprovedNotification(
    to: string,
    data: {
      authorName: string;
      eventTitle: string;
      eventUrl: string;
    },
  ): Promise<boolean> {
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
    } catch (err: unknown) {
      this.logger.error(`Failed to send approved email to ${to}: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  // ===================================
  // Checkout / Order Notifications
  // ===================================

  /**
   * Подтверждение создания заказа — отправляется сразу после createCheckoutSession.
   */
  async sendOrderCreated(
    to: string,
    data: {
      customerName: string;
      shortCode: string;
      items: Array<{ title: string; quantity: number; price: number }>;
      totalPrice: number;
    },
  ): Promise<boolean> {
    if (!this.enabled) {
      this.logger.warn(`[DRY RUN] Order created → ${to}: ${data.shortCode}`);
      return false;
    }
    try {
      await this.mailer.sendMail({
        to,
        subject: `Заказ ${data.shortCode} оформлен — Дайбилет`,
        template: 'order-created',
        context: {
          ...data,
          trackUrl: `${this.appUrl}/orders/track?code=${data.shortCode}`,
          appUrl: this.appUrl,
        },
      });
      this.logger.log(`Order created email sent → ${to} (${data.shortCode})`);
      return true;
    } catch (err: unknown) {
      this.logger.error(`Failed to send order-created to ${to}: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  /**
   * Заказ подтверждён оператором.
   */
  async sendOrderConfirmed(
    to: string,
    data: {
      customerName: string;
      shortCode: string;
      items: Array<{ title: string; quantity: number; price: number }>;
      totalPrice: number;
      operationalItems?: Array<{
        eventTitle: string;
        meetingPoint?: string | null;
        meetingInstructions?: string | null;
        operationalPhone?: string | null;
        operationalNote?: string | null;
      }>;
    },
  ): Promise<boolean> {
    if (!this.enabled) {
      this.logger.warn(`[DRY RUN] Order confirmed → ${to}: ${data.shortCode}`);
      return false;
    }

    // Filter operational items that have at least one field
    const opItems = (data.operationalItems || []).filter(
      (i) => i.meetingPoint || i.meetingInstructions || i.operationalPhone || i.operationalNote,
    );

    try {
      await this.mailer.sendMail({
        to,
        subject: `Заказ ${data.shortCode} подтверждён — Дайбилет`,
        template: 'order-confirmed',
        context: {
          ...data,
          hasOperationalInfo: opItems.length > 0,
          operationalItems: opItems,
          trackUrl: `${this.appUrl}/orders/track?code=${data.shortCode}`,
          appUrl: this.appUrl,
        },
      });
      this.logger.log(`Order confirmed email sent → ${to} (${data.shortCode})`);
      return true;
    } catch (err: unknown) {
      this.logger.error(`Failed to send order-confirmed to ${to}: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  /**
   * Заказ отклонён.
   */
  async sendOrderRejected(
    to: string,
    data: {
      customerName: string;
      shortCode: string;
      reason?: string;
    },
  ): Promise<boolean> {
    if (!this.enabled) {
      this.logger.warn(`[DRY RUN] Order rejected → ${to}: ${data.shortCode}`);
      return false;
    }
    try {
      await this.mailer.sendMail({
        to,
        subject: `Заказ ${data.shortCode} не подтверждён — Дайбилет`,
        template: 'order-rejected',
        context: {
          ...data,
          helpUrl: `${this.appUrl}/help`,
          appUrl: this.appUrl,
        },
      });
      this.logger.log(`Order rejected email sent → ${to} (${data.shortCode})`);
      return true;
    } catch (err: unknown) {
      this.logger.error(`Failed to send order-rejected to ${to}: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  /**
   * Заказ истёк (не подтверждён вовремя).
   */
  async sendOrderExpired(
    to: string,
    data: {
      customerName: string;
      shortCode: string;
      reason?: string;
    },
  ): Promise<boolean> {
    if (!this.enabled) {
      this.logger.warn(`[DRY RUN] Order expired → ${to}: ${data.shortCode}`);
      return false;
    }
    try {
      await this.mailer.sendMail({
        to,
        subject: `Заказ ${data.shortCode} истёк — Дайбилет`,
        template: 'order-expired',
        context: {
          ...data,
          helpUrl: `${this.appUrl}/help`,
          appUrl: this.appUrl,
        },
      });
      this.logger.log(`Order expired email sent → ${to} (${data.shortCode})`);
      return true;
    } catch (err: unknown) {
      this.logger.error(`Failed to send order-expired to ${to}: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  /**
   * Заказ завершён — запрос отзыва (через X дней после визита).
   */
  async sendOrderCompleted(
    to: string,
    data: {
      customerName: string;
      shortCode: string;
      eventTitle: string;
      reviewUrl: string;
    },
  ): Promise<boolean> {
    if (!this.enabled) {
      this.logger.warn(`[DRY RUN] Order completed → ${to}: ${data.shortCode}`);
      return false;
    }
    try {
      await this.mailer.sendMail({
        to,
        subject: `Как прошёл визит? Оцените ${data.eventTitle} — Дайбилет`,
        template: 'order-completed',
        context: {
          ...data,
          trackUrl: `${this.appUrl}/orders/track?code=${data.shortCode}`,
          appUrl: this.appUrl,
        },
      });
      this.logger.log(`Order completed email sent → ${to} (${data.shortCode})`);
      return true;
    } catch (err: unknown) {
      this.logger.error(`Failed to send order-completed to ${to}: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  /**
   * Уведомить администратора о новом тикете поддержки.
   */
  async notifyAdminNewTicket(data: {
    ticketCode: string;
    name: string;
    email: string;
    category: string;
    message: string;
  }): Promise<void> {
    if (!this.enabled) {
      this.logger.warn(`[DRY RUN] Admin: new support ticket ${data.ticketCode}`);
      return;
    }
    try {
      await this.mailer.sendMail({
        to: this.adminEmail,
        subject: `Новый тикет ${data.ticketCode}: ${data.category}`,
        html: `
          <h3>Новый запрос в поддержку</h3>
          <p><b>Код:</b> ${data.ticketCode}</p>
          <p><b>Имя:</b> ${data.name}</p>
          <p><b>Email:</b> ${data.email}</p>
          <p><b>Категория:</b> ${data.category}</p>
          <p><b>Сообщение:</b> ${data.message.substring(0, 500)}${data.message.length > 500 ? '...' : ''}</p>
          <p><a href="${this.appUrl}/admin/support">Открыть в админке →</a></p>
        `,
      });
      this.logger.log(`Admin notified about new ticket ${data.ticketCode}`);
    } catch (err: unknown) {
      this.logger.error(`Failed to notify admin about ticket: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Ответ на тикет поддержки — уведомление клиента.
   */
  async sendTicketReply(
    to: string,
    data: {
      customerName: string;
      ticketCode: string;
      message: string;
    },
  ): Promise<boolean> {
    if (!this.enabled) {
      this.logger.warn(`[DRY RUN] Ticket reply → ${to}: ${data.ticketCode}`);
      return false;
    }
    try {
      await this.mailer.sendMail({
        to,
        subject: `Ответ на обращение ${data.ticketCode} — Дайбилет`,
        template: 'ticket-reply',
        context: {
          ...data,
          helpUrl: `${this.appUrl}/help`,
          appUrl: this.appUrl,
        },
      });
      this.logger.log(`Ticket reply email sent → ${to} (${data.ticketCode})`);
      return true;
    } catch (err: unknown) {
      this.logger.error(`Failed to send ticket-reply to ${to}: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  /**
   * Подарочный сертификат — письмо получателю с кодом.
   */
  async sendGiftCertificate(
    to: string,
    data: {
      code: string;
      amountKopecks: number;
      senderName?: string | null;
      message?: string | null;
    },
  ): Promise<boolean> {
    if (!this.enabled) {
      this.logger.warn(`[DRY RUN] Gift certificate → ${to}: ${data.code}`);
      return false;
    }

    const amountFormatted = `${(data.amountKopecks / 100).toLocaleString('ru-RU')} ₽`;

    try {
      await this.mailer.sendMail({
        to,
        subject: `Вам подарили сертификат на ${amountFormatted} — Дайбилет`,
        template: 'gift-certificate',
        context: {
          code: data.code,
          amountFormatted,
          senderName: data.senderName || null,
          message: data.message || null,
          appUrl: this.appUrl,
        },
      });
      this.logger.log(`Gift certificate email sent → ${to} (${data.code})`);
      return true;
    } catch (err: unknown) {
      this.logger.error(
        `Failed to send gift certificate to ${to}: ${err instanceof Error ? err.message : String(err)}`,
      );
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
    } catch (err: unknown) {
      this.logger.error(`Failed to notify admin: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * O5: Report ready notification (email delivery).
   */
  async sendReportReady(
    to: string,
    data: { reportType: string; xlsPath: string; pdfPath: string },
  ): Promise<boolean> {
    if (!this.enabled) {
      this.logger.warn(`[DRY RUN] Report ready → ${to}: ${data.reportType}`);
      return false;
    }
    try {
      await this.mailer.sendMail({
        to,
        subject: `Отчёт ${data.reportType} готов`,
        html: `
          <h3>Отчёт ${data.reportType} сформирован</h3>
          <p>XLS: ${data.xlsPath}</p>
          <p>PDF: ${data.pdfPath}</p>
        `,
      });
      return true;
    } catch (err: unknown) {
      this.logger.error(`Failed to send report email: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }
}
