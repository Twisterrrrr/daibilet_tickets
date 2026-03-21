import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { AuditInterceptor } from './audit.interceptor';
import { EdoDeliveryService } from '../edo/services/edo-delivery.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin')
export class AdminEdoDeliveryController {
  constructor(private readonly edoDelivery: EdoDeliveryService) {}

  @Get('documents/:id/edo-deliveries')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Список отправок документа в ЭДО' })
  async getDocumentDeliveries(@Param('id') id: string) {
    return this.edoDelivery.getDocumentDeliveries(id);
  }

  @Post('documents/:id/send-to-edo')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Отправить документ в ЭДО' })
  async sendToEdo(
    @Param('id') id: string,
    @Req() req: { user?: { id: string } },
  ) {
    const userId = req.user?.id ?? null;
    return this.edoDelivery.sendDocument(id, userId);
  }

  @Post('edo-deliveries/:id/refresh')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Обновить статус доставки ЭДО' })
  async refreshDelivery(@Param('id') id: string) {
    return this.edoDelivery.refreshDeliveryStatus(id);
  }

  @Post('edo-deliveries/:id/retry')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Повторить отправку документа в ЭДО' })
  async retryDelivery(
    @Param('id') id: string,
    @Req() req: { user?: { id: string } },
  ) {
    const userId = req.user?.id ?? null;
    return this.edoDelivery.retryDelivery(id, userId);
  }
}
