import { Body, Controller, Get, Param, Post, Query, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { AuditInterceptor } from '../admin/audit.interceptor';
import { ChatService } from './chat.service';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

type AuthedRequest = {
  user?: {
    id?: string;
    role?: string;
    name?: string;
    email?: string;
  };
};

class AdminChatSendDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  text: string;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/chat')
export class AdminChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('conversations')
  @ApiTags('admin-chat')
  @Roles('ADMIN', 'EDITOR')
  async listConversations(
    @Query('status') status?: string,
    @Query('needsReply') needsReplyRaw?: string,
    @Query('search') search?: string,
    @Query('limit') limitRaw = '50',
  ) {
    const needsReply = needsReplyRaw === '1' || needsReplyRaw === 'true';
    const limit = Number(limitRaw) || 50;
    return this.chat.adminListConversations({ status, needsReply, search, limit });
  }

  @Get('conversations/:id/messages')
  @ApiTags('admin-chat')
  @Roles('ADMIN', 'EDITOR')
  async listMessages(@Param('id') id: string, @Query('after') after?: string) {
    return this.chat.adminListMessages(id, after);
  }

  @Post('conversations/:id/messages')
  @ApiTags('admin-chat')
  @Roles('ADMIN', 'EDITOR')
  async sendMessage(@Param('id') id: string, @Body() body: AdminChatSendDto, @Req() req: AuthedRequest) {
    return this.chat.adminSendMessage(id, {
      text: body.text,
      adminId: req.user?.id,
      adminName: req.user?.name || 'Поддержка',
    });
  }
}

