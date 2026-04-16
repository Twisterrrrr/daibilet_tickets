import { describe, expect, it } from 'vitest';

import { ExternalIntegrationState, ExternalOrderStatus } from '@/prisma-client';

import { mapTcOrderStatusToMirror } from '../tc-order-mirror.mapping';

describe('mapTcOrderStatusToMirror', () => {
  it('maps done to CONFIRMED', () => {
    expect(mapTcOrderStatusToMirror('done')).toEqual({
      status: ExternalOrderStatus.CONFIRMED,
      integrationState: ExternalIntegrationState.CONFIRMED,
    });
  });

  it('maps cancelled', () => {
    expect(mapTcOrderStatusToMirror('cancelled')).toEqual({
      status: ExternalOrderStatus.CANCELLED,
      integrationState: ExternalIntegrationState.CONFIRMED,
    });
  });

  it('maps expired to FAILED + RECONCILE_REQUIRED', () => {
    expect(mapTcOrderStatusToMirror('expired')).toEqual({
      status: ExternalOrderStatus.FAILED,
      integrationState: ExternalIntegrationState.RECONCILE_REQUIRED,
    });
  });

  it('maps in_progress to OPEN', () => {
    expect(mapTcOrderStatusToMirror('in_progress').status).toBe(ExternalOrderStatus.OPEN);
  });
});
