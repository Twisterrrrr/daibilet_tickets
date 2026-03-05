import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import {
  TeplohodWidgetCheckoutReqDto,
  TeplohodWidgetCheckoutResDto,
  TeplohodWidgetEventDto,
  TeplohodWidgetEventSessionDto,
  TeplohodWidgetQueryDto,
} from '@daibilet/shared';

function looksLikeUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export function normalizeTeplohodExternalId(input: string | number): string {
  const s = String(input).trim();
  const m = s.match(/(\d+)/);
  if (!m) return s;
  return m[1];
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case '\'':
        return '&#039;';
      default:
        return c;
    }
  });
}

@Injectable()
export class TeplohodWidgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async getEventDto(q: TeplohodWidgetQueryDto): Promise<TeplohodWidgetEventDto> {
    const lang = q.lang ?? 'ru';
    const theme = q.theme ?? 'light';
    const layout = q.layout ?? 'compact';

    if (!q.eventId) {
      throw new NotFoundException('eventId is required');
    }

    const event = await this.findEvent(q.eventId);

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const sessions: TeplohodWidgetEventSessionDto[] = event.sessions.map((s) => ({
      id: s.id,
      startIso: s.startsAt.toISOString(),
      endIso: s.endsAt ? s.endsAt.toISOString() : undefined,
      price: s.prices && Array.isArray(s.prices) && s.prices.length > 0 ? Number((s.prices[0] as any).price) : undefined,
      available: s.isActive && !s.canceledAt,
      reasonClosed: s.canceledAt ? 'CANCELLED' : undefined,
    }));

    return {
      provider: 'TEPLOHOD',
      event: {
        id: event.id,
        externalId: event.tcEventId ?? undefined,
        title: event.title,
        city: event.city?.name ?? undefined,
        imageUrl: event.imageUrl ?? undefined,
        url: `/events/${event.slug}`,
        priceFrom: event.priceFrom ?? undefined,
        currency: 'RUB',
      },
      sessions,
      ui: {
        lang,
        theme,
        layout,
      },
    };
  }

  async renderHtml(q: TeplohodWidgetQueryDto): Promise<string> {
    const safeEventId = String(q.eventId ?? '');
    const lang = q.lang ?? 'ru';
    const theme = q.theme ?? 'light';
    const layout = q.layout ?? 'compact';

    return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    html,body{margin:0;padding:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}
  </style>
</head>
<body>
  <div id="db-teplohod-root"
       data-event-id="${escapeHtml(safeEventId)}"
       data-lang="${lang}"
       data-theme="${theme}"
       data-layout="${layout}"></div>
  <script>
    window.__DB_TEP__ = {
      eventId: ${JSON.stringify(safeEventId)},
      lang: ${JSON.stringify(lang)},
      theme: ${JSON.stringify(theme)},
      layout: ${JSON.stringify(layout)}
    };
  </script>
  <script src="/static/widgets/teplohod-embed.js" defer></script>
</body>
</html>`;
  }

  async createCheckout(body: TeplohodWidgetCheckoutReqDto): Promise<TeplohodWidgetCheckoutResDto> {
    const params = new URLSearchParams();
    params.set('eventId', body.eventId);
    if (body.sessionId) params.set('sessionId', body.sessionId);
    if (body.qty != null) params.set('qty', String(body.qty));
    if (body.returnUrl) params.set('returnUrl', body.returnUrl);

    return {
      checkoutUrl: `/checkout?${params.toString()}`,
    };
  }

  private async findEvent(eventId: string) {
    const raw = eventId.trim();

    if (looksLikeUuid(raw)) {
      return this.prisma.event.findFirst({
        where: { id: raw, isActive: true, isDeleted: false },
        include: {
          city: true,
          sessions: {
            where: { isActive: true },
            orderBy: { startsAt: 'asc' },
          },
        },
      });
    }

    const externalId = normalizeTeplohodExternalId(raw);

    return this.prisma.event.findFirst({
      where: {
        source: 'TEPLOHOD',
        isActive: true,
        isDeleted: false,
        OR: [
          // Современный формат: голое число из Teplohod API (tcEventId = "<id>")
          { tcEventId: externalId },
          // Исторические записи с префиксом в tcEventId (tep-123, TEP_123 и т.п.)
          { tcEventId: `tep-${externalId}` },
        ],
      },
      include: {
        city: true,
        sessions: {
          where: { isActive: true },
          orderBy: { startsAt: 'asc' },
        },
      },
    });
  }
}

