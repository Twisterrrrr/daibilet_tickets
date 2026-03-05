import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';

import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';

/** Auto-priority based on category + order linkage */
function autoDetectPriority(category: string, orderCode?: string): string {
  if (category === 'REFUND') return 'HIGH';
  if (category === 'TECHNICAL') return 'HIGH';
  if (category === 'ORDER' && orderCode) return 'HIGH';
  if (category === 'ORDER') return 'MEDIUM';
  return 'MEDIUM';
}

/** Auto-subject based on category */
function autoSubject(category: string): string {
  switch (category) {
    case 'ORDER':
      return 'Вопрос по заказу';
    case 'REFUND':
      return 'Запрос на возврат';
    case 'VENUE':
      return 'Вопрос о месте / мероприятии';
    case 'TECHNICAL':
      return 'Техническая проблема';
    default:
      return 'Обращение в поддержку';
  }
}

/** SLA deadlines by priority (hours) */
const SLA_HOURS: Record<string, number> = {
  URGENT: 1,
  HIGH: 4,
  MEDIUM: 24,
  LOW: 72,
};

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Создать публичный тикет (из формы на /help).
   */
  async createTicket(data: {
    name: string;
    email: string;
    phone?: string;
    category?: string;
    orderCode?: string;
    message: string;
  }) {
    const category = data.category || 'OTHER';
    const priority = autoDetectPriority(category, data.orderCode);
    const subject = autoSubject(category);

    const shortCode = `ST-${Date.now().toString(36).toUpperCase()}`;

    const slaHours = SLA_HOURS[priority] || 24;
    const slaDeadline = new Date();
    slaDeadline.setHours(slaDeadline.getHours() + slaHours);

    const _ticket = await this.prisma.supportTicket.create({
      data: {
        shortCode,
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        category: category as TicketCategory,
        priority: priority as TicketPriority,
        status: 'OPEN',
        subject,
        message: data.message,
        orderCode: data.orderCode || null,
        slaDeadline,
      },
    });

    // Notify admin
    this.mailService
      .notifyAdminNewTicket({
        ticketCode: shortCode,
        name: data.name,
        email: data.email,
        category,
        message: data.message,
      })
      .catch((err) => this.logger.error(`Failed to notify admin: ${err.message}`));

    this.logger.log(`Created support ticket ${shortCode} [${category}/${priority}]`);

    return {
      ticketCode: shortCode,
      message: 'Ваше обращение принято. Мы ответим в течение 24 часов.',
    };
  }

  /**
   * Получить тикет по shortCode (публичный).
   */
  async getTicketByCode(shortCode: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { shortCode: shortCode.toUpperCase() },
      include: {
        responses: {
          where: { isInternal: false },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    return ticket;
  }

  // ===========================
  // Admin methods
  // ===========================

  async listTickets(params: { status?: string; category?: string; search?: string; page: number; limit: number }) {
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.category) where.category = params.category;
    if (params.search) {
      where.OR = [
        { shortCode: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { name: { contains: params.search, mode: 'insensitive' } },
        { orderCode: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        include: { _count: { select: { responses: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return { items, total, page: params.page, pages: Math.ceil(total / params.limit) };
  }

  async getTicketById(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        responses: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!ticket) throw new NotFoundException('Тикет не найден');
    return ticket;
  }

  async updateTicketStatus(id: string, status: string, assignedTo?: string) {
    const updateData: any = { status: status as TicketStatus };
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (status === 'RESOLVED' || status === 'CLOSED') {
      updateData.resolvedAt = new Date();
    }

    return this.prisma.supportTicket.update({
      where: { id },
      data: updateData,
    });
  }

  async addResponse(
    id: string,
    data: {
      message: string;
      authorType: string;
      authorName: string;
      isInternal: boolean;
    },
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Тикет не найден');

    const response = await this.prisma.ticketResponse.create({
      data: {
        ticketId: id,
        authorType: data.authorType,
        authorName: data.authorName,
        message: data.message,
        isInternal: data.isInternal,
      },
    });

    // If admin reply (non-internal), send email to customer
    if (data.authorType === 'admin' && !data.isInternal) {
      // Move to WAITING_CUSTOMER
      await this.prisma.supportTicket.update({
        where: { id },
        data: { status: TicketStatus.WAITING_CUSTOMER },
      });

      this.mailService
        .sendTicketReply(ticket.email, {
          customerName: ticket.name,
          ticketCode: ticket.shortCode,
          message: data.message,
        })
        .catch((e) => this.logger.error('Ticket reply email failed: ' + e.message));
    }

    return response;
  }

  /**
   * Dashboard stats for support overview.
   */
  async getStats() {
    const [open, inProgress, waitingCustomer, resolved, closed, total] = await Promise.all([
      this.prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      this.prisma.supportTicket.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.supportTicket.count({ where: { status: 'WAITING_CUSTOMER' } }),
      this.prisma.supportTicket.count({ where: { status: 'RESOLVED' } }),
      this.prisma.supportTicket.count({ where: { status: 'CLOSED' } }),
      this.prisma.supportTicket.count(),
    ]);

    // SLA breach: tickets where slaDeadline < now and status is OPEN or IN_PROGRESS
    const slaBreached = await this.prisma.supportTicket.count({
      where: {
        status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] },
        slaDeadline: { lt: new Date() },
      },
    });

    // By category
    const byCategory = await this.prisma.supportTicket.groupBy({
      by: ['category'],
      _count: { id: true },
    });

    return {
      open,
      inProgress,
      waitingCustomer,
      resolved,
      closed,
      total,
      slaBreached,
      byCategory: byCategory.map((c) => ({ category: c.category, count: c._count.id })),
    };
  }
}
