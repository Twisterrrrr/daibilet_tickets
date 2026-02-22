import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/cancellation-policies')
export class AdminCancellationPolicyController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query('scopeType') scopeType?: string,
    @Query('provider') provider?: string,
    @Query('active') active?: string,
  ) {
    const where: Record<string, unknown> = {};
    if (scopeType) where.scopeType = scopeType;
    if (provider) where.provider = provider;
    if (active === 'true') where.isActive = true;
    if (active === 'false') where.isActive = false;

    return this.prisma.cancellationPolicyTemplate.findMany({
      where,
      orderBy: [{ scopeType: 'asc' }, { name: 'asc' }],
    });
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const p = await this.prisma.cancellationPolicyTemplate.findUnique({
      where: { id },
    });
    if (!p) throw new NotFoundException('Policy not found');
    return p;
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  async create(
    @Body()
    body: {
      scopeType: string;
      scopeId?: string;
      provider?: string;
      name: string;
      publicText?: string;
      shortBadge?: string;
      ruleJson: Record<string, unknown>;
      isActive?: boolean;
    },
  ) {
    return this.prisma.cancellationPolicyTemplate.create({
      data: {
        scopeType: body.scopeType as 'PLATFORM' | 'PROVIDER' | 'OPERATOR' | 'OFFER',
        scopeId: body.scopeId ?? null,
        provider: (body.provider as 'TEPLOHOD' | 'TICKETS_CLOUD' | 'OTHER') ?? null,
        name: body.name,
        publicText: body.publicText ?? null,
        shortBadge: body.shortBadge ?? null,
        ruleJson: body.ruleJson as object,
        isActive: body.isActive ?? true,
      },
    });
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      publicText?: string;
      shortBadge?: string;
      ruleJson?: Record<string, unknown>;
      isActive?: boolean;
    },
  ) {
    const p = await this.prisma.cancellationPolicyTemplate.findUnique({
      where: { id },
    });
    if (!p) throw new NotFoundException('Policy not found');
    return this.prisma.cancellationPolicyTemplate.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.publicText !== undefined && { publicText: body.publicText }),
        ...(body.shortBadge !== undefined && { shortBadge: body.shortBadge }),
        ...(body.ruleJson !== undefined && { ruleJson: body.ruleJson as object }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    const p = await this.prisma.cancellationPolicyTemplate.findUnique({
      where: { id },
    });
    if (!p) throw new NotFoundException('Policy not found');
    await this.prisma.cancellationPolicyTemplate.delete({ where: { id } });
    return { deleted: true };
  }
}
