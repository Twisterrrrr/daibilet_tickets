import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards, UseInterceptors, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/checkout')
export class AdminCheckoutController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Список checkout sessions с фильтрацией.
   */
  @Get('sessions')
  async listSessions(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') pageRaw = '1',
    @Query('limit') limitRaw = '25',
  ) {
    const page = Number(pageRaw) || 1;
    const limit = Number(limitRaw) || 25;
    const where: any = {};

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { shortCode: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.checkoutSession.findMany({
        where,
        include: {
          _count: { select: { orderRequests: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.checkoutSession.count({ where }),
    ]);

    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  /**
   * Детали checkout session.
   */
  @Get('sessions/:id')
  async getSession(@Param('id') id: string) {
    const session = await this.prisma.checkoutSession.findUnique({
      where: { id },
      include: { orderRequests: true },
    });
    if (!session) throw new NotFoundException('Сессия не найдена');
    return session;
  }

  /**
   * Обновить статус checkout session.
   */
  @Patch('sessions/:id')
  @Roles('ADMIN', 'EDITOR')
  async updateSession(
    @Param('id') id: string,
    @Body() data: { status?: string },
  ) {
    const session = await this.prisma.checkoutSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Сессия не найдена');

    return this.prisma.checkoutSession.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status as any }),
      },
    });
  }

  /**
   * Список order requests с фильтрацией.
   */
  @Get('requests')
  async listRequests(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') pageRaw = '1',
    @Query('limit') limitRaw = '25',
  ) {
    const page = Number(pageRaw) || 1;
    const limit = Number(limitRaw) || 25;
    const where: any = {};

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.orderRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.orderRequest.count({ where }),
    ]);

    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  /**
   * Подтвердить заявку (PENDING -> CONFIRMED).
   */
  @Post('requests/:id/confirm')
  @Roles('ADMIN', 'EDITOR')
  async confirmRequest(
    @Param('id') id: string,
    @Body() data: { adminNote?: string },
  ) {
    const request = await this.prisma.orderRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Заявка не найдена');
    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Нельзя подтвердить заявку со статусом ${request.status}`);
    }

    return this.prisma.orderRequest.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        adminNote: data.adminNote || request.adminNote,
      },
    });
  }

  /**
   * Отклонить заявку (PENDING -> REJECTED).
   */
  @Post('requests/:id/reject')
  @Roles('ADMIN', 'EDITOR')
  async rejectRequest(
    @Param('id') id: string,
    @Body() data: { adminNote?: string },
  ) {
    const request = await this.prisma.orderRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Заявка не найдена');
    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Нельзя отклонить заявку со статусом ${request.status}`);
    }

    return this.prisma.orderRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        adminNote: data.adminNote || request.adminNote,
      },
    });
  }
}
