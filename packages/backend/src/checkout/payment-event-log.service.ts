/**
 * PaymentEventLog — raw webhook audit log (accept & log).
 * Идемпотентность: unique (provider, eventType, paymentId).
 * YooKassa повторяет webhook — дубликат не создаёт запись, возвращаем 200.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

const PROVIDER = 'YOOKASSA';

@Injectable()
export class PaymentEventLogService {
  private readonly logger = new Logger(PaymentEventLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Записать webhook в лог. Идемпотентно — дубликат (provider+eventType+paymentId) не создаёт запись.
   * @returns true = записано, false = дубликат
   */
  async logOnce(
    eventType: string,
    paymentId: string,
    payload: unknown,
  ): Promise<boolean> {
    const idempotencyKey = `${eventType}:${paymentId}`;
    try {
      await this.prisma.paymentEventLog.create({
        data: {
          provider: PROVIDER,
          eventType,
          paymentId,
          idempotencyKey,
          payload: payload as Prisma.InputJsonValue,
        },
      });
      this.logger.debug(`PaymentEventLog: logged ${eventType} paymentId=${paymentId}`);
      return true;
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') {
        this.logger.debug(`PaymentEventLog: duplicate skipped ${eventType} paymentId=${paymentId}`);
        return false;
      }
      throw error;
    }
  }
}
