import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards, UseInterceptors, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { AuditInterceptor } from './audit.interceptor';
import { SupportService } from '../support/support.service';
import { UpdateTicketDto, ReplyTicketDto } from './dto/admin-support.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/support')
export class AdminSupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('tickets')
  @ApiTags('admin-support')
  async listTickets(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('page') pageRaw = '1',
    @Query('limit') limitRaw = '25',
  ) {
    return this.supportService.listTickets({
      status,
      category,
      search,
      page: Number(pageRaw) || 1,
      limit: Number(limitRaw) || 25,
    });
  }

  @Get('tickets/:id')
  async getTicket(@Param('id') id: string) {
    return this.supportService.getTicketById(id);
  }

  @Patch('tickets/:id')
  @Roles('ADMIN', 'EDITOR')
  async updateTicket(
    @Param('id') id: string,
    @Body() body: UpdateTicketDto,
  ) {
    if (body.status) {
      return this.supportService.updateTicketStatus(id, body.status, body.assignedTo);
    }
    return this.supportService.getTicketById(id);
  }

  @Post('tickets/:id/reply')
  @Roles('ADMIN', 'EDITOR')
  async replyToTicket(
    @Param('id') id: string,
    @Body() body: ReplyTicketDto,
  ) {
    return this.supportService.addResponse(id, {
      message: body.message,
      authorType: 'admin',
      authorName: body.authorName || 'Поддержка',
      isInternal: body.isInternal || false,
    });
  }

  @Get('stats')
  async getStats() {
    return this.supportService.getStats();
  }
}
