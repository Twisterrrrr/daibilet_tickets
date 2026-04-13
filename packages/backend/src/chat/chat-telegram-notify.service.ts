import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { TelegramBotApiClient } from './telegram-bot-api.client';

const TG_MESSAGE_MAX = 3500;

function truncateForTelegram(text: string, max = TG_MESSAGE_MAX): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function parseOperatorUserIds(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

@Injectable()
export class ChatTelegramNotifyService {
  private readonly logger = new Logger(ChatTelegramNotifyService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly telegram: TelegramBotApiClient,
  ) {}

  /**
   * Уведомления в Telegram включены: токен бота и список операторов.
   */
  isEnabled(): boolean {
    if (!this.telegram.isConfigured()) return false;
    return parseOperatorUserIds(this.config.get<string>('TELEGRAM_OPERATOR_USER_IDS')).length > 0;
  }

  getBotUsername(): string | null {
    const u = (this.config.get<string>('TELEGRAM_BOT_USERNAME') ?? '').trim();
    return u ? u.replace(/^@/, '') : null;
  }

  /**
   * Рассылка операторам о новом/очередном сообщении клиента в чате.
   */
  async notifyOperatorsAboutCustomerMessage(data: {
    conversationId: string;
    guestName: string | null;
    guestEmail: string | null;
    guestPhone: string | null;
    message: string;
  }): Promise<void> {
    if (!this.isEnabled()) {
      this.logger.debug(
        'Telegram: уведомление пропущено — задайте TELEGRAM_BOT_TOKEN и TELEGRAM_OPERATOR_USER_IDS (через запятую, numeric id).',
      );
      return;
    }

    const operatorIds = parseOperatorUserIds(this.config.get<string>('TELEGRAM_OPERATOR_USER_IDS'));
    const who = data.guestEmail || data.guestName || data.guestPhone || 'Гость';
    const snippet = truncateForTelegram(data.message);
    const botUser = this.getBotUsername();
    const deepLink = botUser ? `https://t.me/${botUser}?start=conv_${data.conversationId}` : null;

    const lines = [
      'Чат поддержки: новое сообщение от клиента',
      `Диалог: ${data.conversationId}`,
      `Клиент: ${who}`,
    ];
    if (data.guestPhone) lines.push(`Телефон: ${data.guestPhone}`);
    lines.push('', snippet);
    if (deepLink) {
      lines.push('', `Открыть в Telegram: ${deepLink}`);
      lines.push(`(или отправьте боту: /start conv_${data.conversationId})`);
    } else {
      lines.push('', `Чтобы ответить из Telegram, задайте TELEGRAM_BOT_USERNAME и откройте диалог: /start conv_${data.conversationId}`);
    }

    const text = lines.join('\n');

    for (const chatId of operatorIds) {
      void this.telegram.sendMessage(chatId, text).then((ok) => {
        if (!ok) this.logger.warn(`Failed Telegram notify to chat_id=${chatId} conv=${data.conversationId}`);
      });
    }
  }
}
