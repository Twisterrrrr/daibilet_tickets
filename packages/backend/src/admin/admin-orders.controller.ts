import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { IdempotencyScope, PackageStatus, Prisma } from '@prisma/client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { buildPaginatedResult, paginationArgs, parsePagination } from '../common/pagination';
import { IdempotencyService } from '../common/idempotency.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { VoucherService } from '../voucher/voucher.service';
import { AuditService } from './audit.service';
import { AuditInterceptor } from './audit.interceptor';
import { OrderActionDto, OrderStatusDto } from './dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly voucherService: VoucherService,
    private readonly config: ConfigService,
    private readonly idempotency: IdempotencyService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(
    @Query('status') status?: string,
    @Query('city') city?: string,
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pg = parsePagination({ cursor, page, limit });
    const where: Prisma.PackageWhereInput = {};
    if (status) where.status = status as PackageStatus;
    if (city) where.city = { slug: city };
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rawItems, total] = await Promise.all([
      this.prisma.package.findMany({
        where,
        include: {
          city: { select: { slug: true, name: true } },
          _count: { select: { items: true } },
          voucher: { select: { shortCode: true } },
        },
        orderBy: { createdAt: 'desc' },
        ...paginationArgs(pg),
      }),
      this.prisma.package.count({ where }),
    ]);

    return buildPaginatedResult(rawItems, total, pg.limit);
  }

  /**
   * Поиск заказов для Ops/Directus (упрощённый список).
   *
   * GET /admin/orders/search?query=...&status=...&from=...&to=...&limit=...
   */
  @Get('search')
  @ApiOperation({ summary: 'Поиск заказов (orderId, code, email, phone)' })
  async search(
    @Query('query') query: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const trimmed = (query || '').trim();
    if (!trimmed || trimmed.length < 3) {
      throw new BadRequestException('query должен быть длиной не менее 3 символов');
    }

    const pg = parsePagination({ cursor, page: '1', limit: limit || '50' });

    const where: Prisma.PackageWhereInput = {};
    if (status) where.status = status as PackageStatus;

    // Временной диапазон
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to);
    }

    // Поисковый запрос по id/code/email/phone/paymentId
    where.OR = [
      // По id — только точное совпадение (UUID).
      { id: trimmed },
      { code: { contains: trimmed, mode: 'insensitive' } },
      { email: { contains: trimmed, mode: 'insensitive' } },
      { phone: { contains: trimmed, mode: 'insensitive' } },
      { paymentId: { contains: trimmed, mode: 'insensitive' } },
    ];

    const [rawItems, total] = await Promise.all([
      this.prisma.package.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...paginationArgs(pg),
      }),
      this.prisma.package.count({ where }),
    ]);

    const hasMore = rawItems.length > pg.limit;
    const items = hasMore ? rawItems.slice(0, pg.limit) : rawItems;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    const mapped = items.map((p) => ({
      id: p.id,
      status: p.status,
      createdAt: p.createdAt,
      email: p.email,
      phone: p.phone,
      totalAmount: p.totalPrice,
      currency: 'RUB',
      provider: 'ticketscloud', // на текущем этапе все заказы идут через TC/YooKassa
      eventTitle: null as string | null,
      operatorName: null as string | null,
      paymentId: p.paymentId,
      fulfilmentStatus: p.fulfilledAt ? 'DONE' : 'PENDING',
    }));

    return {
      items: mapped,
      nextCursor,
      total,
    };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.prisma.package.findUniqueOrThrow({
      where: { id },
      include: {
        city: { select: { slug: true, name: true } },
        items: {
          include: {
            event: { select: { id: true, title: true, slug: true, imageUrl: true } },
            session: { select: { id: true, startsAt: true, prices: true } },
          },
          orderBy: [{ dayNumber: 'asc' }, { slot: 'asc' }],
        },
        voucher: true,
      },
    });
  }

  @Patch(':id/status')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Изменить статус заказа (с reason для аудита)' })
  async updateStatus(@Param('id') id: string, @Body() body: OrderStatusDto) {
    const { status, reason } = body;
    const safe: Record<string, string[]> = {
      DRAFT: ['PENDING_PAYMENT'],
      PENDING_PAYMENT: ['PAID', 'FAILED'],
      PAID: ['FULFILLING', 'REFUNDED'],
      FULFILLING: ['FULFILLED', 'PARTIALLY_FULFILLED', 'FAILED'],
      FAILED: ['REFUNDED'],
    };

    const pkg = await this.prisma.package.findUniqueOrThrow({ where: { id } });
    const allowed = safe[pkg.status] || [];

    if (!allowed.includes(status)) {
      throw new BadRequestException(`Невозможен переход ${pkg.status} → ${status}`);
    }

    return this.prisma.package.update({
      where: { id },
      data: { status: status as PackageStatus },
    });
  }

  @Post(':id/resend-email')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Повторная отправка письма с ваучером' })
  async resendEmail(@Param('id') id: string, @Body() body: OrderActionDto) {
    const pkg = await this.prisma.package.findUniqueOrThrow({
      where: { id },
      include: {
        voucher: true,
        items: { take: 1, include: { event: { select: { title: true } } } },
      },
    });

    if (!pkg.voucher) {
      throw new BadRequestException('Ваучер не создан. Используйте retry-fulfilment.');
    }

    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const eventTitle = pkg.items[0]?.event?.title ?? 'экскурсию';
    const reviewUrl = `${appUrl}/review?code=${pkg.voucher.shortCode}`;

    const ok = await this.mailService.sendOrderCompleted(pkg.email, {
      customerName: pkg.customerName,
      shortCode: pkg.code,
      eventTitle,
      reviewUrl,
      voucherCode: pkg.voucher.shortCode,
      voucherUrl: pkg.voucher.publicUrl,
    });

    return { status: ok ? 'email_sent' : 'email_failed', to: pkg.email };
  }

  /**
   * Resend для Directus Ops: обёртка над resend-email с единым контрактом.
   *
   * POST /admin/orders/:id/resend
   */
  @Post(':id/resend')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Повторная отправка письма (Directus Ops)' })
  async resendForOps(
    @Param('id') id: string,
    @Body() body: OrderActionDto,
    @Req() req: { user?: { id?: string } & Record<string, unknown>; requestId?: string },
  ) {
    const key = body.idempotencyKey && body.idempotencyKey.trim().length > 0 ? body.idempotencyKey : `order-resend:${id}`;
    const userId = req.user?.id as string | undefined;
    const requestId = req.requestId;

    return this.idempotency.run(
      IdempotencyScope.EMAIL_SEND,
      key,
      async () => {
        const res = await this.resendEmail(id, body);
        const payload = {
          ok: res.status === 'email_sent',
          actionId: `resend-${id}-${Date.now()}`,
          orderId: id,
          sentTo: res.to,
          createdAt: new Date().toISOString(),
        };

        if (userId) {
          await this.audit.log(
            userId,
            'UPDATE',
            'OrderResendEmail',
            id,
            { reason: body.reason },
            payload,
          );
        }

        return payload;
      },
      {
        entityId: id,
        requestId,
        meta: {
          type: 'ORDER_RESEND_EMAIL',
          reason: body.reason,
        },
      },
    );
  }

  @Post(':id/retry-fulfilment')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Retry fulfilment: создать ваучер если отсутствует, отправить письмо' })
  async retryFulfilment(@Param('id') id: string, @Body() body: OrderActionDto) {
    const pkg = await this.prisma.package.findUniqueOrThrow({
      where: { id },
      include: {
        voucher: true,
        items: { take: 1, include: { event: { select: { title: true } } } },
      },
    });

    if (!['PAID', 'FULFILLING', 'FULFILLED', 'PARTIALLY_FULFILLED'].includes(pkg.status)) {
      throw new BadRequestException(`Retry fulfilment доступен только для PAID/FULFILLING/FULFILLED, текущий: ${pkg.status}`);
    }

    let voucher = pkg.voucher;
    if (!voucher) {
      voucher = await this.voucherService.createForPackage(pkg.id);
    }

    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const eventTitle = pkg.items[0]?.event?.title ?? 'экскурсию';
    const reviewUrl = `${appUrl}/review?code=${voucher.shortCode}`;

    const ok = await this.mailService.sendOrderCompleted(pkg.email, {
      customerName: pkg.customerName,
      shortCode: pkg.code,
      eventTitle,
      reviewUrl,
      voucherCode: voucher.shortCode,
      voucherUrl: voucher.publicUrl,
    });

    return {
      status: ok ? 'fulfilment_completed' : 'email_failed',
      voucherCreated: !pkg.voucher,
      emailSent: ok,
      to: pkg.email,
    };
  }

  /**
   * Retry fulfilment для Directus Ops: контракт ActionResponse.
   *
   * POST /admin/orders/:id/retry-fulfilment (тот же путь, другой формат ответа для Ops).
   */
  @Post(':id/retry-fulfilment-ops')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Retry fulfilment (Directus Ops)' })
  async retryFulfilmentForOps(
    @Param('id') id: string,
    @Body() body: OrderActionDto,
    @Req() req: { user?: { id?: string } & Record<string, unknown>; requestId?: string },
  ) {
    const key =
      body.idempotencyKey && body.idempotencyKey.trim().length > 0
        ? body.idempotencyKey
        : `order-retry-fulfilment:${id}`;
    const userId = req.user?.id as string | undefined;
    const requestId = req.requestId;

    return this.idempotency.run(
      IdempotencyScope.EXTERNAL_CALLBACK,
      key,
      async () => {
        await this.retryFulfilment(id, body);
        const payload = {
          ok: true,
          actionId: `retry-${id}-${Date.now()}`,
          orderId: id,
          jobId: null,
          enqueuedAt: new Date().toISOString(),
        };

        if (userId) {
          await this.audit.log(
            userId,
            'UPDATE',
            'OrderRetryFulfilment',
            id,
            { reason: body.reason },
            payload,
          );
        }

        return payload;
      },
      {
        entityId: id,
        requestId,
        meta: {
          type: 'ORDER_RETRY_FULFILMENT',
          reason: body.reason,
        },
      },
    );
  }
}
