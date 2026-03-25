import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { ChatService } from './chat.service';
import { ChatSendMessageDto, ChatStartDto } from './dto/chat.dto';

function extractGuestToken(authorization?: string): string | null {
  if (!authorization) return null;
  const m = authorization.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}

@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  /**
   * Public endpoint for guests (no auth).
   * Returns guestToken that the widget stores locally.
   */
  @Post('start')
  @Throttle({ default: { ttl: 60_000, limit: 6 } })
  async start(@Body() body: ChatStartDto) {
    return this.chat.startConversation({
      name: body.name,
      email: body.email,
      message: body.message,
      honey: body.honey,
    });
  }

  @Get(':id/messages')
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  async listMessages(
    @Param('id') id: string,
    @Query('after') after?: string,
    @Headers('authorization') authorization?: string,
  ) {
    const guestToken = extractGuestToken(authorization);
    if (!guestToken) {
      // Do not leak existence — behave as not found (handled in service).
      return this.chat.listMessages(id, 'invalid', after);
    }
    return this.chat.listMessages(id, guestToken, after);
  }

  @Post(':id/messages')
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  async sendMessage(
    @Param('id') id: string,
    @Body() body: ChatSendMessageDto,
    @Headers('authorization') authorization?: string,
  ) {
    const guestToken = extractGuestToken(authorization);
    if (!guestToken) {
      return this.chat.sendCustomerMessage(id, 'invalid', { text: body.text, honey: body.honey });
    }
    return this.chat.sendCustomerMessage(id, guestToken, { text: body.text, honey: body.honey });
  }
}

