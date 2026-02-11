import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TcApiService } from '../catalog/tc-api.service';

/**
 * Checkout Service — покупка билетов.
 *
 * Флоу для TC событий:
 * 1. Клиент выбирает билеты → POST /checkout/tc
 * 2. Бэкенд создаёт заказ в TC API v2 (билеты зарезервированы на 15 мин)
 * 3. Бэкенд возвращает данные заказа + ссылку на оплату (YooKassa)
 * 4. Клиент оплачивает → webhook → подтверждение заказа в TC
 * 5. TC отправляет билеты на email
 *
 * Пока YooKassa не подключена — возвращаем данные заказа для подтверждения.
 */
@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tcApi: TcApiService,
  ) {}

  /**
   * Создать заказ в Ticketscloud.
   *
   * @param eventSlug — slug или UUID события в нашей БД
   * @param items — [{ setId, quantity }]
   * @param customerEmail — email покупателя (для отправки билетов)
   */
  async createTcOrder(body: {
    eventId: string;
    items: Array<{ setId: string; quantity: number }>;
    customerEmail?: string;
    customerName?: string;
  }) {
    // 1. Найти событие в нашей БД
    // tcEventId — это строка (TC ObjectId или tep-xxx), не UUID
    // id — UUID, slug — строка
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        body.eventId,
      );

    const event = await this.prisma.event.findFirst({
      where: {
        OR: [
          ...(isUuid ? [{ id: body.eventId }] : []),
          { slug: body.eventId },
          { tcEventId: body.eventId },
        ],
      },
    });

    if (!event) {
      throw new NotFoundException(`Событие не найдено: ${body.eventId}`);
    }

    if (event.source !== 'TC') {
      throw new BadRequestException(
        'Прямая покупка пока доступна только для событий Ticketscloud',
      );
    }

    if (!event.tcEventId) {
      throw new BadRequestException('У события нет идентификатора TC');
    }

    // 2. Подготовить random-маппинг для TC
    // TC ожидает: { "random": { "set_id_1": qty_1, "set_id_2": qty_2 } }
    const random: Record<string, number> = {};
    let totalQty = 0;

    for (const item of body.items) {
      if (item.quantity <= 0) continue;
      random[item.setId] = item.quantity;
      totalQty += item.quantity;
    }

    if (totalQty === 0) {
      throw new BadRequestException('Выберите хотя бы один билет');
    }

    // 3. Создать заказ в TC API
    this.logger.log(
      `Creating TC order: event=${event.tcEventId}, items=${JSON.stringify(random)}`,
    );

    let tcOrder: any;
    try {
      tcOrder = await this.tcApi.createOrder({
        event: event.tcEventId,
        random,
      });
    } catch (err: any) {
      this.logger.error(`TC order creation failed: ${err.message}`);
      throw new BadRequestException(
        `Не удалось создать заказ: ${err.message}`,
      );
    }

    const orderData = tcOrder?.data || tcOrder;

    // 4. Обновить заказ с данными покупателя и включить отправку билетов
    if (orderData.id) {
      try {
        await this.tcApi.updateOrder(orderData.id, {
          settings: {
            send_tickets: true,
          },
          vendor_data: {
            customer_email: body.customerEmail || '',
            customer_name: body.customerName || '',
            source: 'daibilet.ru',
          },
        });
        this.logger.log(`Updated TC order ${orderData.id} with customer data`);
      } catch (err: any) {
        this.logger.warn(
          `Failed to update TC order with customer data: ${err.message}`,
        );
      }
    }

    // 5. Автоподтверждение заказа — TC отправит билеты покупателю
    // Партнёр (мы) подтверждает заказ, TC обрабатывает доставку билетов.
    // Оплата проходит через билетную систему (реквизиты партнёра прописаны в TC).
    let confirmedOrder: any = null;
    try {
      confirmedOrder = await this.tcApi.finishOrder(orderData.id);
      this.logger.log(
        `TC order ${orderData.id} confirmed (status: done). Tickets will be sent.`,
      );
    } catch (err: any) {
      this.logger.error(`TC order confirmation failed: ${err.message}`);
      // Заказ создан, но не подтверждён — билеты зарезервированы
    }

    const finalOrder = confirmedOrder?.data || orderData;

    // 6. Рассчитать стоимость
    const values = finalOrder.values || orderData.values || {};
    const totalPrice = parseFloat(values.full || '0') * 100; // в копейках

    // 7. Сформировать ответ
    return {
      success: true,
      order: {
        id: finalOrder.id || orderData.id,
        number: finalOrder.number || orderData.number,
        status: finalOrder.status || orderData.status,
        expiresAt: orderData.expired_after,
        tickets: (orderData.tickets || []).map((t: any) => ({
          id: t.id,
          number: t.number,
          setId: t.set,
          price: parseFloat(t.full || '0') * 100, // копейки
          status: t.status,
        })),
        totalPrice, // копейки
        totalPriceFormatted: `${(totalPrice / 100).toLocaleString('ru-RU')} ₽`,
      },
      event: {
        id: event.id,
        title: event.title,
        slug: event.slug,
        imageUrl: event.imageUrl,
      },
      confirmed: !!confirmedOrder,
      message: confirmedOrder
        ? 'Заказ оформлен! Билеты будут отправлены на вашу почту.'
        : 'Билеты зарезервированы на 15 минут.',
    };
  }

  /**
   * Подтвердить заказ TC (после оплаты).
   */
  async confirmTcOrder(tcOrderId: string) {
    this.logger.log(`Confirming TC order: ${tcOrderId}`);

    try {
      const result = await this.tcApi.finishOrder(tcOrderId);
      return {
        success: true,
        order: result?.data || result,
        message: 'Заказ подтверждён. Билеты будут отправлены на email.',
      };
    } catch (err: any) {
      this.logger.error(`TC order confirmation failed: ${err.message}`);
      throw new BadRequestException(
        `Не удалось подтвердить заказ: ${err.message}`,
      );
    }
  }

  /**
   * Отменить заказ TC.
   */
  async cancelTcOrder(tcOrderId: string) {
    this.logger.log(`Cancelling TC order: ${tcOrderId}`);

    try {
      const result = await this.tcApi.updateOrder(tcOrderId, {
        status: 'cancelled',
      });
      return {
        success: true,
        message: 'Заказ отменён. Билеты возвращены в продажу.',
      };
    } catch (err: any) {
      this.logger.error(`TC order cancellation failed: ${err.message}`);
      throw new BadRequestException(
        `Не удалось отменить заказ: ${err.message}`,
      );
    }
  }

  async create(body: any) {
    // TODO: Реализовать создание Package + платёж YooKassa (Trip Planner)
    return {
      message: 'Checkout create — в разработке. Требуется подключение YooKassa.',
    };
  }

  async handleWebhook(body: any) {
    // TODO: Верификация IP + подпись, обработка payment.succeeded / payment.canceled
    return { status: 'ok' };
  }

  async getStatus(packageId: string) {
    const pkg = await this.prisma.package.findUnique({
      where: { id: packageId },
      include: {
        items: { include: { event: true } },
        voucher: true,
      },
    });

    if (!pkg) throw new NotFoundException('Пакет не найден');

    return {
      status: pkg.status,
      voucherUrl: pkg.voucher?.publicUrl || null,
    };
  }
}
