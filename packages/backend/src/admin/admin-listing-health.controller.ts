import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { ListingHealthService } from '../catalog/listing-health.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'EDITOR')
@Controller('admin/catalog')
export class AdminListingHealthController {
  constructor(private readonly listingHealth: ListingHealthService) {}

  @Get('health')
  @ApiOperation({ summary: 'Качество листингов (Listing Health) по поставщику' })
  async getHealth(@Query('operatorId') operatorId: string) {
    if (!operatorId) {
      return { score: 0, issues: [], recommendations: [], byEvent: [] };
    }
    return this.listingHealth.computeForOperator(operatorId);
  }
}

