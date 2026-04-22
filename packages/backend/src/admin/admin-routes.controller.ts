import { Controller, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/routes')
export class AdminRoutesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async list(@Query('limit') limit?: string) {
    const lim = Math.min(500, Math.max(1, limit ? Number.parseInt(limit, 10) || 50 : 50));
    const items = await this.prisma.route.findMany({
      take: lim,
      orderBy: [{ updatedAt: 'desc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        estimatedMinutes: true,
        updatedAt: true,
        _count: { select: { points: true } },
      },
    });
    return { items };
  }

  @Get(':id')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async get(@Param('id') id: string) {
    const route = await this.prisma.route.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        pointsOfInterest: true,
        estimatedMinutes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { points: true } },
      },
    });
    if (!route) throw new NotFoundException('Route not found');
    return route;
  }
}
