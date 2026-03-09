import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { AuditInterceptor } from './audit.interceptor';
import { AdminPromoCollectionsService } from './admin-promo-collections.service';
import {
  CreatePromoCollectionDto,
  CreatePromoCollectionItemDto,
  UpdatePromoCollectionDto,
  UpdatePromoCollectionItemDto,
  UpsertPromoCollectionRuleDto,
} from './dto/admin-promo-collection.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/promo-collections')
export class AdminPromoCollectionsController {
  constructor(private readonly service: AdminPromoCollectionsService) {}

  @Get()
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async list() {
    return this.service.list();
  }

  @Get(':id')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  async create(@Body() data: CreatePromoCollectionDto) {
    return this.service.create(data);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  async update(@Param('id') id: string, @Body() data: UpdatePromoCollectionDto) {
    return this.service.update(id, data);
  }

  @Delete(':id')
  @Roles('ADMIN')
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get(':id/items')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async listItems(@Param('id') id: string) {
    return this.service.listItems(id);
  }

  @Post(':id/items')
  @Roles('ADMIN', 'EDITOR')
  async addItem(@Param('id') id: string, @Body() data: CreatePromoCollectionItemDto) {
    return this.service.addItem(id, data);
  }

  @Patch(':id/items/:itemId')
  @Roles('ADMIN', 'EDITOR')
  async updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() data: UpdatePromoCollectionItemDto,
  ) {
    return this.service.updateItem(id, itemId, data);
  }

  @Delete(':id/items/:itemId')
  @Roles('ADMIN', 'EDITOR')
  async removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.service.removeItem(id, itemId);
  }

  @Get(':id/rule')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async getRule(@Param('id') id: string) {
    return this.service.getRule(id);
  }

  @Put(':id/rule')
  @Roles('ADMIN', 'EDITOR')
  async upsertRule(@Param('id') id: string, @Body() data: UpsertPromoCollectionRuleDto) {
    return this.service.upsertRule(id, data);
  }

  @Get(':id/preview')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async preview(@Param('id') id: string) {
    return this.service.preview(id);
  }
}
