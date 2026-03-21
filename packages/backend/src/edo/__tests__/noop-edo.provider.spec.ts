/**
 * P4: Тесты NoopEdoProvider.
 */
import { describe, expect, it } from 'vitest';

import { NoopEdoProvider } from '../providers/noop-edo.provider';
import type { EdoSendParams } from '../domain/edo.types';

describe('NoopEdoProvider', () => {
  const provider = new NoopEdoProvider();

  it('getProviderType возвращает NOOP', () => {
    expect(provider.getProviderType()).toBe('NOOP');
  });

  it('sendDocument возвращает SENT и providerDeliveryId в формате noop_<id>', async () => {
    const params: EdoSendParams = {
      deliveryId: 'delivery-abc123',
      documentId: 'doc-xyz',
      operatorId: 'op-1',
      reportId: 'rep-1',
      documentType: 'AGENT_REPORT',
      providerProfile: { provider: 'NOOP', boxId: null, inn: '1234567890', kpp: null, settingsJson: null },
      supplierDocument: { id: 'doc-xyz', title: 'Test', payloadJson: {} },
      legalProfileSnapshot: null,
    };

    const result = await provider.sendDocument(params);

    expect(result.status).toBe('SENT');
    expect(result.providerDeliveryId).toBe('noop_delivery-abc123');
    expect(result.meta).toMatchObject({ stub: true, noop: true, documentId: 'doc-xyz' });
  });

  it('getDeliveryStatus возвращает SENT для NOOP', async () => {
    const result = await provider.getDeliveryStatus({
      deliveryId: 'del-1',
      providerDeliveryId: 'noop_del-1',
      provider: 'NOOP',
    });

    expect(result.status).toBe('SENT');
    expect(result.meta).toMatchObject({ stub: true, noop: true });
  });
});
