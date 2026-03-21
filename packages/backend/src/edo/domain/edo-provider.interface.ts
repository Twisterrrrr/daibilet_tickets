import type { EdoProviderType, EdoDeliveryStatus } from '@prisma/client';
import type {
  EdoSendParams,
  EdoSendResult,
  EdoDeliveryStatusResult,
  EdoProviderProfile,
} from './edo.types';

/**
 * Интерфейс провайдера ЭДО.
 * Абстракция над оператором электронного документооборота (Диадок, СБИС и т.д.).
 */
export interface EdoProvider {
  getProviderType(): EdoProviderType;

  /**
   * Отправить документ в ЭДО.
   * Возвращает providerDeliveryId и статус.
   */
  sendDocument(params: EdoSendParams): Promise<EdoSendResult>;

  /**
   * Получить текущий статус доставки.
   */
  getDeliveryStatus(params: {
    deliveryId: string;
    providerDeliveryId: string | null;
    provider: EdoProviderType;
  }): Promise<EdoDeliveryStatusResult>;

  /**
   * Опционально: валидация профиля перед активацией.
   */
  validateProfile?(profile: EdoProviderProfile): Promise<void>;
}
