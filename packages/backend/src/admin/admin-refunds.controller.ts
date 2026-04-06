import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { FulfillmentRefundRequestService } from '../checkout/fulfillment-refund-request.service';
import { AuditInterceptor } from './audit.interceptor';
import { CreateAdminRefundDto } from './dto/admin-refund.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/refunds')
export class AdminRefundsController {
  constructor(private readonly fulfillmentRefundRequests: FulfillmentRefundRequestService) {}

  @Post()
  @Roles('ADMIN', 'EDITOR')
  async create(@Body() body: CreateAdminRefundDto) {
    return this.fulfillmentRefundRequests.createForItem({
      fulfillmentItemId: body.itemId,
      reason: body.reason,
      reasonNote: body.reasonNote,
    });
  }

  @Post(':id/process')
  @Roles('ADMIN', 'EDITOR')
  async process(@Param('id', ParseUUIDPipe) id: string) {
    return this.fulfillmentRefundRequests.process(id);
  }

  @Post(':id/approve')
  @Roles('ADMIN', 'EDITOR')
  async approve(@Param('id', ParseUUIDPipe) id: string) {
    return this.fulfillmentRefundRequests.approve(id);
  }

  @Post(':id/reject')
  @Roles('ADMIN', 'EDITOR')
  async reject(@Param('id', ParseUUIDPipe) id: string) {
    return this.fulfillmentRefundRequests.reject(id);
  }
}
