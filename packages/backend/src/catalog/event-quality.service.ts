import { Injectable } from '@nestjs/common';
import { DateMode, EventCategory } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

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

    if (!event.venueId && !event.meetingPoint && !event.address) {
      issues.push({
        code: 'MISSING_LOCATION',
        message: 'Не указано место проведения (venue или адрес/точка встречи)',
        field: 'location',
      });
    }

    const activeOffers = event.offers.filter((o) => !o.isDeleted && o.status === 'ACTIVE');
    if (activeOffers.length === 0) {
      issues.push({
        code: 'MISSING_ACTIVE_OFFER',
        message: 'Нет ни одного активного оффера с валидной ценой',
        field: 'offers',
      });
    }

    if (event.dateMode === DateMode.SCHEDULED) {
      const now = new Date();
      const hasFutureSession = event.sessions.some((s) => s.startsAt > now && s.isActive);
      if (!hasFutureSession) {
        issues.push({
          code: 'NO_FUTURE_SESSIONS',
          message: 'Нет будущих активных сеансов для расписания',
          field: 'sessions',
        });
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
          qualityIssues: result.issues,
          qualityCheckedAt: new Date(),
        },
      })
      .catch(() => {
        // Если override ещё не создан (MANUAL событие без overrides) — ничего не делаем.
      });

    return result;
  }
}

