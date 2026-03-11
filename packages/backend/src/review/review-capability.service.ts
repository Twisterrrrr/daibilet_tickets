import { Injectable } from '@nestjs/common';
import { EventSource } from '@prisma/client';

/**
 * Событие или минимальный снимок для проверки capability.
 * Используется для canAcceptReviews / isImportedAggregatorEvent.
 */
export interface EventCapabilityInput {
  source: EventSource;
  supplierId?: string | null;
  operatorId?: string | null;
}

/**
 * MVP: Отзывы полностью ОТКЛЮЧЕНЫ для импортируемых событий (TC, TEPLOHOD).
 * Разрешены только для MANUAL с owner (supplierId/operatorId).
 * Нет claim ownership для imported events в MVP.
 */
@Injectable()
export class ReviewCapabilityService {
  /**
   * Разрешены ли отзывы для данного события.
   * TC, TEPLOHOD → false.
   * MANUAL + (supplierId ИЛИ operatorId) → true.
   */
  canAcceptReviews(event: EventCapabilityInput): boolean {
    if (this.isImportedAggregatorEvent(event)) {
      return false;
    }
    const hasOwner = !!(event.supplierId || event.operatorId);
    return event.source === 'MANUAL' && hasOwner;
  }

  /**
   * Является ли событие импортированным из агрегатора (TC, TEPLOHOD).
   * Для таких событий отзывы в MVP отключены.
   */
  isImportedAggregatorEvent(event: EventCapabilityInput): boolean {
    return event.source === 'TC' || event.source === 'TEPLOHOD';
  }

  /**
   * Требует ли отзыв ответа поставщика (рейтинг ≤ 3 → очередь "требует ответа").
   */
  requiresSupplierResponse(rating: number): boolean {
    return rating >= 1 && rating <= 3;
  }
}
