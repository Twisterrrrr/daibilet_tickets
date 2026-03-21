import { Controller, Get, Param, Put, Body, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { AuditInterceptor } from './audit.interceptor';
import { EdoProfileService } from '../edo/services/edo-profile.service';
import { UpsertSupplierEdoProfileDto } from '../edo/dto/upsert-supplier-edo-profile.dto';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/suppliers')
export class AdminSupplierEdoController {
  constructor(
    private readonly edoProfile: EdoProfileService,
    private readonly prisma: PrismaService,
  ) {}

  @Get(':id/edo-profile')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Профиль ЭДО поставщика' })
  async getEdoProfile(@Param('id') id: string) {
    const profile = await this.edoProfile.getByOperatorId(id);

    if (!profile) {
      return null;
    }

    const legalProfile = await this.prisma.supplierLegalProfile.findUnique({
      where: { operatorId: id },
      select: { inn: true, docsEmail: true },
    });

    const statusHint = !profile.isActive
      ? 'INACTIVE'
      : profile.provider === 'DIADOK' && !profile.boxId
        ? 'INCOMPLETE'
        : 'READY';

    return {
      ...profile,
      legalProfileExists: !!legalProfile,
      docsEmail: legalProfile?.docsEmail ?? null,
      supplierLegalInn: legalProfile?.inn ?? null,
      statusHint,
    };
  }

  @Put(':id/edo-profile')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Создать/обновить профиль ЭДО поставщика' })
  async upsertEdoProfile(
    @Param('id') id: string,
    @Body() body: UpsertSupplierEdoProfileDto,
  ) {
    return this.edoProfile.upsertProfile(id, body);
  }
}
