import { Injectable } from '@nestjs/common';
import { DateMode, EventCategory, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { isSellable } from './sellable';

export interface EventQualityIssue {
  code: string;
  message: string;
  field?: string;
}

export interface EventQualityResult {
  isReady: boolean;
  issues: EventQualityIssue[];
}

@Injectable()
export class EventQualityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Валидация события перед публикацией.
   * Проверяет минимальный набор полей и возвращает список проблем.
   */
  async validateForPublish(eventId: string): Promise<EventQualityResult> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        city: { select: { id: true, slug: true, name: true } },
        venue: { select: { id: true, title: true } },
        offers: true,
        sessions: { where: { isActive: true } },
        override: true,
      },
    });

    if (!event) {
      return {
        isReady: false,
        issues: [{ code: 'EVENT_NOT_FOUND', message: 'Событие не найдено' }],
      };
    }

    const issues: EventQualityIssue[] = [];

    const title = event.override?.title ?? event.title;
    if (!title || !title.trim()) {
      issues.push({
        code: 'MISSING_TITLE',
        message: 'Не заполнен заголовок события',
        field: 'title',
      });
    }

    if (!event.cityId) {
      issues.push({
        code: 'MISSING_CITY',
        message: 'Не указан город события',
        field: 'cityId',
      });
    }

    const category: EventCategory | null = event.override?.category ?? event.category;
    if (!category) {
      issues.push({
        code: 'MISSING_CATEGORY',
        message: 'Не указана категория события',
        field: 'category',
      });
    }

    const description = event.override?.description ?? event.description;
    if (!description || !description.trim()) {
      issues.push({
        code: 'MISSING_DESCRIPTION',
        message: 'Описание события отсутствует или слишком короткое',
        field: 'description',
      });
    }

    const imageUrl = event.override?.imageUrl ?? event.imageUrl ?? event.venue?.title;
    if (!imageUrl) {
      issues.push({
        code: 'MISSING_IMAGE',
        message: 'Не задано основное изображение события',
        field: 'imageUrl',
      });
    }

    const hasLocation = event.venueId || event.address || event.offers.some((o) => o.meetingPoint);
    if (!hasLocation) {
      issues.push({
        code: 'MISSING_LOCATION',
        message: 'Не указано место проведения (venue или адрес/точка встречи)',
        field: 'location',
      });
    }

    const now = new Date();
    const sellable = isSellable(event, event.offers, event.sessions, now);
    if (!sellable) {
      const activeOffers = event.offers.filter((o) => !o.isDeleted && o.status === 'ACTIVE');
      const withPrice = activeOffers.filter((o) => o.priceFrom != null && o.priceFrom > 0);
      if (activeOffers.length === 0) {
        issues.push({
          code: 'MISSING_ACTIVE_OFFER',
          message: 'Нет ни одного активного оффера с валидной ценой',
          field: 'offers',
        });
      } else if (withPrice.length === 0) {
        issues.push({
          code: 'NO_VALID_PRICE',
          message: 'Активные офферы без указанной цены — укажите priceFrom',
          field: 'offers',
        });
      } else if (event.dateMode === DateMode.SCHEDULED) {
        const hasFutureSession = event.sessions.some((s) => s.startsAt > now && s.isActive);
        if (!hasFutureSession) {
          issues.push({
            code: 'NO_FUTURE_SESSIONS',
            message: 'Нет будущих активных сеансов для расписания',
            field: 'sessions',
          });
        }
      } else if (event.dateMode === DateMode.OPEN_DATE && event.endDate) {
        if (new Date(event.endDate) < now) {
          issues.push({
            code: 'END_DATE_PASSED',
            message: 'Дата окончания события истекла',
            field: 'endDate',
          });
        }
      }
    }

    const isReady = issues.length === 0;
    return { isReady, issues };
  }

  /**
   * Пересчитать качество события и сохранить в EventOverride.
   */
  async checkAndPersist(eventId: string): Promise<EventQualityResult> {
    const result = await this.validateForPublish(eventId);

    await this.prisma.eventOverride
      .update({
        where: { eventId },
        data: {
          qualityStatus: result.isReady ? 'READY' : 'BLOCKED',
          qualityIssues: result.issues as unknown as Prisma.InputJsonValue,
          qualityCheckedAt: new Date(),
        },
      })
      .catch(() => {
        // Если override ещё не создан (MANUAL событие без overrides) — ничего не делаем.
      });

    return result;
  }
}

