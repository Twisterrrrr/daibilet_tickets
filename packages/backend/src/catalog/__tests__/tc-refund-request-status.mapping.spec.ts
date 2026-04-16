import { describe, expect, it } from 'vitest';

import { RefundRequestStatus } from '@/prisma-client';

import { mapTcRefundStatusToRefundRequestStatus } from '../tc-refund-request-status.mapping';

describe('mapTcRefundStatusToRefundRequestStatus', () => {
  it('maps approved to COMPLETED', () => {
    expect(mapTcRefundStatusToRefundRequestStatus('approved')).toBe(RefundRequestStatus.COMPLETED);
  });

  it('maps rejected', () => {
    expect(mapTcRefundStatusToRefundRequestStatus('rejected')).toBe(RefundRequestStatus.REJECTED);
  });

  it('maps in_progress to PROCESSING', () => {
    expect(mapTcRefundStatusToRefundRequestStatus('in_progress')).toBe(RefundRequestStatus.PROCESSING);
  });

  it('maps new to CREATED', () => {
    expect(mapTcRefundStatusToRefundRequestStatus('new')).toBe(RefundRequestStatus.CREATED);
  });

  it('returns null for unknown', () => {
    expect(mapTcRefundStatusToRefundRequestStatus('unknown')).toBeNull();
  });
});
