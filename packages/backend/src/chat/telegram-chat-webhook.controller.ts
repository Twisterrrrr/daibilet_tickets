import { Controller, Logger, Post, Req, UnauthorizedException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';

import {
  TelegramChatWebhookService,
  type TelegramWebhookUpdate,
} from './telegram-chat-webhook.service';

@ApiExcludeController()
@Controller('webhooks')
export class TelegramChatWebhookController {
  private readonly logger = new Logger(TelegramChatWebhookController.name);

  constructor(private readonly telegramChatWebhook: TelegramChatWebhookService) {}

  /**
   * Входящие обновления от Telegram Bot API.
   * Защита: заголовок X-Telegram-Bot-Api-Secret-Token (см. setWebhook secret_token).
   */
  @Post('telegram')
  @SkipThrottle()
  async handleTelegramWebhook(@Req() req: Request) {
    const secretHeader = req.headers['x-telegram-bot-api-secret-token'];
    if (
      !this.telegramChatWebhook.isWebhookSecretConfigured() ||
      !this.telegramChatWebhook.verifyWebhookSecret(secretHeader)
    ) {
      throw new UnauthorizedException();
    }

    const body = req.body as TelegramWebhookUpdate;

    try {
      await this.telegramChatWebhook.handleUpdate(body);
    } catch (e) {
      this.logger.error(
        `Telegram webhook handler error: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    return { ok: true };
  }
}
