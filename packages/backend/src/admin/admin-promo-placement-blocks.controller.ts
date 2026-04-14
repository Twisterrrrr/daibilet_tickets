import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { AuditInterceptor } from './audit.interceptor';
import { AdminPromoPlacementBlocksService } from './admin-promo-placement-blocks.service';
import {
  AdminPromoPlacementBlocksQueryDto,
  CreatePromoPlacementBlockDto,
  UpdatePromoPlacementBlockDto,
} from './dto/admin-promo-placement-block.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/promo-placement-blocks')
export class AdminPromoPlacementBlocksController {
  constructor(private readonly service: AdminPromoPlacementBlocksService) {}

  @Get()
  async list(@Query() query: AdminPromoPlacementBlocksQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  async create(@Body() data: CreatePromoPlacementBlockDto) {
    return this.service.create(data);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  async update(@Param('id') id: string, @Body() data: UpdatePromoPlacementBlockDto) {
    return this.service.update(id, data);
  }
}

