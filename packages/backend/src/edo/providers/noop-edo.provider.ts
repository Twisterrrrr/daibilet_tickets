import { EdoProviderType } from '@prisma/client';

import type { EdoProvider } from '../domain/edo-provider.interface';
import type { EdoSendParams, EdoSendResult, EdoDeliveryStatusResult } from '../domain/edo.types';

/**
 * Stub-провайдер ЭДО. Не выполняет реальную отправку.
 * Возвращает предсказуемый результат (SENT, providerDeliveryId = noop_<id>).
 */
export class NoopEdoProvider implements EdoProvider {
  getProviderType(): EdoProviderType {
    return 'NOOP';
  }

  async sendDocument(params: EdoSendParams): Promise<EdoSendResult> {
    const providerDeliveryId = `noop_${params.deliveryId}`;
    return {
      providerDeliveryId,
      status: 'SENT',
      meta: {
        stub: true,
        noop: true,
        documentId: params.documentId,
      },
    };
  }

  async getDeliveryStatus(params: {
    deliveryId: string;
    providerDeliveryId: string | null;
    provider: EdoProviderType;
  }): Promise<EdoDeliveryStatusResult> {
    // Для NOOP возвращаем SENT как стабильное состояние.
    return {
      status: 'SENT',
      meta: {
        stub: true,
        noop: true,
        providerDeliveryId: params.providerDeliveryId ?? `noop_${params.deliveryId}`,
      },
    };
  }
}
