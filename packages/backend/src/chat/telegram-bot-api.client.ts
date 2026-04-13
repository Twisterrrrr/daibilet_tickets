import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramBotApiClient {
  private readonly logger = new Logger(TelegramBotApiClient.name);

  constructor(private readonly config: ConfigService) {}

  private get token(): string {
    return (this.config.get<string>('TELEGRAM_BOT_TOKEN') ?? '').trim();
  }

  isConfigured(): boolean {
    return this.token.length > 0;
  }

  /**
   * Отправка текста в чат (личный id пользователя или id группы).
   */
  async sendMessage(chatId: string, text: string): Promise<boolean> {
    if (!this.isConfigured()) return false;
    const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          disable_web_page_preview: true,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        let detail = errText;
        try {
          const j = JSON.parse(errText) as { description?: string };
          if (j?.description) detail = j.description;
        } catch {
          // оставляем raw
        }
        this.logger.warn(`Telegram sendMessage failed: HTTP ${res.status} — ${detail}`);
        if (res.status === 403) {
          this.logger.warn(
            'Подсказка: пользователь с этим chat_id должен один раз открыть бота в Telegram и нажать Start (бот не может сам начать личку).',
          );
        }
        return false;
      }
      return true;
    } catch (e) {
      this.logger.warn(`Telegram sendMessage error: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  }
}
