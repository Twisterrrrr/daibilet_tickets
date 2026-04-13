import { Injectable } from '@nestjs/common';
import {
  DateMode,
  EventAudience,
  EventCategory,
  Prisma,
  SubcategoryLayer,
  SubcategoryType,
} from '@prisma/client';

import { SubcategoryPolicyService } from '../subcategories/subcategory-policy.service';

import { PrismaService } from '../prisma/prisma.service';
import { isSellable } from './sellable';

export interface EventQualityIssue {
  code: string;
  message: string;
  field?: string;
  /** Источник поля: source = из sync/импорта, local = из override (редакция). */
  ownership?: 'source' | 'local';
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
   * Источник истины классификации для publish: category + эффективные подкатегории (M:N links, иначе legacy enum).
   * Теги (STRUCTURAL/POPULAR) не блокируют публикацию.
   */
  async validateForPublish(eventId: string): Promise<EventQualityResult> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        city: { select: { id: true, slug: true, name: true } },
        venue: { select: { id: true, title: true } },
        offers: true,
        sessions: { where: { isActive: true } },
        subcategoryLinks: {
          include: {
            subcategory: { select: { layer: true, type: true, code: true, isActive: true } },
          },
        },
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
        ownership: event.override?.title !== undefined ? 'local' : 'source',
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
        ownership: event.override?.category !== undefined ? 'local' : 'source',
      });
    }

    const allLinks = event.subcategoryLinks ?? [];
    const inactiveLinks = allLinks.filter((l) => l.subcategory?.isActive === false);
    const links = allLinks.filter((l) => l.subcategory?.isActive !== false);
    const legacyEnumCount = Array.isArray(event.subcategories) ? event.subcategories.length : 0;
    const maxSub = SubcategoryPolicyService.MAX_EVENT_SUBCATEGORIES;

    if (inactiveLinks.length > 0) {
      issues.push({
        code: 'HAS_INACTIVE_SUBCATEGORY',
        message:
          'У события есть legacy/неактивные подкатегории. Для новых выборов они недоступны — замените на активные канонические.',
        field: 'subcategories',
        ownership: 'local',
      });
    }

    if (links.length > 0) {
      const primary = links.filter(
        (l) =>
          l.subcategory.layer === SubcategoryLayer.PRIMARY &&
          l.subcategory.type === SubcategoryType.EVENT_ONLY,
      );
      if (primary.length !== 1) {
        issues.push({
          code: 'MISSING_PRIMARY_SUBCATEGORY',
          message: 'Назначьте ровно один основной формат (PRIMARY, EVENT_ONLY) в связях подкатегорий.',
          field: 'subcategories',
          ownership: 'local',
        });
      }
      const secondaries = links.filter((l) => l.subcategory.layer === SubcategoryLayer.SECONDARY);
      if (secondaries.length === 0) {
        issues.push({
          code: 'MISSING_SECONDARY_SUBCATEGORY',
          message: 'Добавьте до трёх дополнительных подкатегорий (SECONDARY) для витрины и SEO.',
          field: 'subcategories',
          ownership: 'local',
        });
      }
      if (links.length > maxSub) {
        issues.push({
          code: 'TOO_MANY_SUBCATEGORIES',
          message: `Слишком много связей подкатегорий (максимум ${maxSub}: 1 основной + 3 доп.).`,
          field: 'subcategories',
          ownership: 'local',
        });
      }
    } else {
      if (legacyEnumCount === 0) {
        issues.push({
          code: 'MISSING_PRIMARY_SUBCATEGORY',
          message:
            'Нет подкатегорий: назначьте PRIMARY+SECONDARY через админку (M:N) или временно legacy enum.',
          field: 'subcategories',
          ownership: 'source',
        });
      } else if (legacyEnumCount > maxSub) {
        issues.push({
          code: 'TOO_MANY_SUBCATEGORIES',
          message: `Слишком много значений в legacy subcategories (максимум ${maxSub}).`,
          field: 'subcategories',
          ownership: 'source',
        });
      }
    }

    const audience = event.override?.audience ?? event.audience;
    if (audience === EventAudience.KIDS) {
      const effMinAge = event.override?.minAge ?? event.minAge;
      if (effMinAge === 0) {
        issues.push({
          code: 'MIN_AGE_REQUIRED_FOR_KIDS',
          message:
            'Для аудитории «Детям» укажите минимальный возраст (minAge): сейчас 0+ по умолчанию — задайте в override при необходимости',
          field: 'minAge',
          ownership: event.override?.minAge !== undefined ? 'local' : 'source',
        });
      }
    }

    const description = event.override?.description ?? event.description;
    if (!description || !description.trim()) {
      issues.push({
        code: 'MISSING_DESCRIPTION',
        message: 'Описание события отсутствует или слишком короткое',
        field: 'description',
        ownership: event.override?.description !== undefined ? 'local' : 'source',
      });
    }

    const imageUrl = event.override?.imageUrl ?? event.imageUrl ?? event.venue?.title;
    if (!imageUrl) {
      issues.push({
        code: 'MISSING_IMAGE',
        message: 'Не задано основное изображение события',
        field: 'imageUrl',
        ownership: event.override?.imageUrl !== undefined ? 'local' : 'source',
      });
    }

    const hasLocation = event.venueId || event.address || event.offers.some((o) => o.meetingPoint);
    if (!hasLocation) {
      issues.push({
        code: 'MISSING_LOCATION',
        message: 'Не указано место проведения (venue или адрес/точка встречи)',
        field: 'location',
        ownership: 'source',
      });
      if (!event.venueId) {
        issues.push({
          code: 'INVALID_VENUE',
          message: 'Площадка не задана или недоступна',
          field: 'venueId',
          ownership: 'source',
        });
      }
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
          ownership: 'source',
        });
      } else if (withPrice.length === 0) {
        issues.push({
          code: 'NO_VALID_PRICE',
          message: 'Активные офферы без указанной цены — укажите priceFrom',
          field: 'offers',
          ownership: 'source',
        });
      } else if (event.dateMode === DateMode.SCHEDULED) {
        const hasFutureSession = event.sessions.some((s) => s.startsAt > now && s.isActive);
        if (!hasFutureSession) {
          issues.push({
            code: 'NO_FUTURE_SESSIONS',
            message: 'Нет будущих активных сеансов для расписания',
            field: 'sessions',
            ownership: 'source',
          });
        }
      } else if (event.dateMode === DateMode.OPEN_DATE && event.endDate) {
        if (new Date(event.endDate) < now) {
          issues.push({
            code: 'END_DATE_PASSED',
            message: 'Дата окончания события истекла',
            field: 'endDate',
            ownership: 'source',
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

