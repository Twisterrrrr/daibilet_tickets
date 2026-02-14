import { Controller, Get, Patch, Param, Body, Query, UseGuards, UseInterceptors, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';
import { parsePagination, paginationArgs, buildPaginatedResult } from '../common/pagination';
import { PackageStatus } from '@prisma/client';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly prisma: PrismaService) {}

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
    const where: any = {};
    if (status) where.status = status;
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
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
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

    return this.prisma.package.update({ where: { id }, data: { status: status as PackageStatus } });
  }
}
