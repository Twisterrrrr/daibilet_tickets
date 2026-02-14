import { Controller, Get, Put, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { SupplierJwtGuard, SupplierRolesGuard, SupplierRoles } from './supplier.guard';
import { UpdateSupplierSettingsDto } from './dto/supplier.dto';

@ApiTags('supplier')
@ApiBearerAuth()
@UseGuards(SupplierJwtGuard, SupplierRolesGuard)
@Controller('supplier/settings')
export class SupplierSettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Настройки поставщика' })
  async getSettings(@Req() req: any) {
    return this.prisma.operator.findUnique({
      where: { id: req.user.operatorId },
      select: {
        id: true, name: true, slug: true, logo: true, website: true,
        companyName: true, inn: true, contactEmail: true, contactPhone: true,
        commissionRate: true, promoRate: true, promoUntil: true,
        trustLevel: true, verifiedAt: true, yookassaAccountId: true,
      },
    });
  }

  @Put()
  @SupplierRoles('OWNER')
  @ApiOperation({ summary: 'Обновить настройки' })
  async updateSettings(@Req() req: any, @Body() data: UpdateSupplierSettingsDto) {
    // Поставщик может менять только контактные/компанейские данные
    return this.prisma.operator.update({
      where: { id: req.user.operatorId },
      data: {
        name: data.name,
        logo: data.logo,
        website: data.website,
        companyName: data.companyName,
        inn: data.inn,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
      },
    });
  }
}
