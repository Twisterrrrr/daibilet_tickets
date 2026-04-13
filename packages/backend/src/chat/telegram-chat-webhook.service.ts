import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from './chat.service';
import { TelegramBotApiClient } from './telegram-bot-api.client';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeEqualUtf8(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}

export type TelegramWebhookUser = { id: number; first_name?: string; username?: string };
export type TelegramWebhookChat = { id: number; type: string };
export type TelegramWebhookMessage = {
  message_id: number;
  text?: string;
  chat: TelegramWebhookChat;
  from?: TelegramWebhookUser;
};

export type TelegramWebhookUpdate = { update_id: number; message?: TelegramWebhookMessage };

@Injectable()
export class TelegramChatWebhookService {
  private readonly logger = new Logger(TelegramChatWebhookService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly chat: ChatService,
    private readonly telegram: TelegramBotApiClient,
  ) {}

  isWebhookSecretConfigured(): boolean {
    return (this.config.get<string>('TELEGRAM_WEBHOOK_SECRET') ?? '').trim().length > 0;
  }

  verifyWebhookSecret(headerValue: string | string[] | undefined): boolean {
    const expected = (this.config.get<string>('TELEGRAM_WEBHOOK_SECRET') ?? '').trim();
    if (!expected) return false;
    const got = Array.isArray(headerValue) ? (headerValue[0] ?? '') : (headerValue ?? '');
    return got.length > 0 && safeEqualUtf8(expected, got);
  }

  private allowlist(): Set<string> {
    const raw = this.config.get<string>('TELEGRAM_OPERATOR_USER_IDS') ?? '';
    const ids = raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return new Set(ids);
  }

  private isAllowedTelegramUser(telegramUserId: string): boolean {
    return this.allowlist().has(telegramUserId);
  }

  async handleUpdate(update: TelegramWebhookUpdate): Promise<void> {
    const msg = update.message;
    if (!msg?.from || !msg.chat) return;
    if (msg.chat.type !== 'private') return;

    const uid = String(msg.from.id);
    if (!this.isAllowedTelegramUser(uid)) {
      this.logger.warn(`Telegram webhook: rejected telegramUserId=${uid}`);
      return;
    }

    const chatId = String(msg.chat.id);

    const reply = async (text: string) => {
      const ok = await this.telegram.sendMessage(chatId, text);
      if (!ok) this.logger.warn(`Telegram webhook: failed to send reply to chat_id=${chatId}`);
    };

    const text = (msg.text ?? '').trim();
    if (!text) {
      await reply('Поддерживается только текст. Используйте команду /start conv_<id> из уведомления.');
      return;
    }

    const lower = text.toLowerCase();
    if (lower === '/help') {
      await reply(
        'Чат поддержки.\nОткройте диалог: /start conv_<uuid> (ссылка в уведомлении).\n/cancel — сбросить активный диалог.',
      );
      return;
    }

    if (lower.startsWith('/start')) {
      const arg = text.replace(/^\/start\s*/i, '').trim();
      if (!arg) {
        await reply(
          'Откройте диалог по ссылке из уведомления или отправьте:\n/start conv_<uuid>\n/help — справка.',
        );
        return;
      }
      const convRaw = /^conv_/i.test(arg) ? arg.replace(/^conv_/i, '') : arg;
      if (!UUID_RE.test(convRaw)) {
        await reply('Неверный код диалога. Используйте ссылку из уведомления.');
        return;
      }
      const exists = await this.prisma.chatConversation.findUnique({
        where: { id: convRaw },
        select: { id: true },
      });
      if (!exists) {
        await reply('Диалог не найден.');
        return;
      }
      await this.prisma.chatTelegramOperatorState.upsert({
        where: { telegramUserId: uid },
        create: { telegramUserId: uid, activeConversationId: convRaw },
        update: { activeConversationId: convRaw },
      });
      await reply(
        `Диалог открыт (${convRaw}). Пишите ответы — их увидит клиент на сайте.\n/cancel — сменить диалог.`,
      );
      return;
    }

    if (lower === '/cancel' || lower === '/close') {
      await this.prisma.chatTelegramOperatorState.updateMany({
        where: { telegramUserId: uid },
        data: { activeConversationId: null },
      });
      await reply('Активный диалог сброшен.');
      return;
    }

    const state = await this.prisma.chatTelegramOperatorState.findUnique({
      where: { telegramUserId: uid },
    });
    if (!state?.activeConversationId) {
      await reply('Нет активного диалога. Откройте: /start conv_<uuid> (в уведомлении).\n/help');
      return;
    }

    const authorName = msg.from.username
      ? `@${msg.from.username}`
      : (msg.from.first_name ?? 'Оператор');

    try {
      await this.chat.adminSendMessage(state.activeConversationId, {
        text,
        adminName: authorName,
      });
    } catch (e) {
      this.logger.error(
        `adminSendMessage failed conv=${state.activeConversationId}: ${e instanceof Error ? e.message : String(e)}`,
      );
      await reply('Не удалось сохранить ответ. Попробуйте ещё раз или откройте диалог заново.');
    }
  }
}
