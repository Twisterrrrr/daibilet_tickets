import { BadRequestException } from '@nestjs/common';

/** Профиль ЭДО для поставщика не найден. */
export class EdoProfileNotFoundError extends BadRequestException {
  constructor(operatorId: string) {
    super(`Профиль ЭДО для поставщика ${operatorId} не найден`);
  }
}

/** Профиль ЭДО неактивен. */
export class EdoProfileInactiveError extends BadRequestException {
  constructor(operatorId: string) {
    super(`Профиль ЭДО поставщика ${operatorId} неактивен`);
  }
}

/** Документ не найден. */
export class EdoDocumentNotFoundError extends BadRequestException {
  constructor(documentId: string) {
    super(`Документ ${documentId} не найден`);
  }
}

/** Документ в статусе, не допускающем отправку в ЭДО. */
export class EdoDocumentStatusError extends BadRequestException {
  constructor(documentId: string, status: string) {
    super(`Документ ${documentId} в статусе ${status} — отправка в ЭДО недоступна`);
  }
}

/** Доставка не найдена. */
export class EdoDeliveryNotFoundError extends BadRequestException {
  constructor(deliveryId: string) {
    super(`Доставка ЭДО ${deliveryId} не найдена`);
  }
}

/** Провайдер ЭДО не реализован. */
export class EdoProviderNotImplementedError extends BadRequestException {
  constructor(provider: string) {
    super(`Провайдер ЭДО "${provider}" не реализован`);
  }
}

/** Валидация профиля: для DIADOK при isActive требуется boxId. */
export class EdoProfileValidationError extends BadRequestException {
  constructor(message: string) {
    super(message);
  }
}
