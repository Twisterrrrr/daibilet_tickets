import { describe, expect, it } from 'vitest';

import { AdminApiError } from '@/api/client';

import { getAdminErrorDisplay, getAdminErrorMessage, getBatchResultItemLabel } from './get-admin-error-message';

describe('getAdminErrorDisplay', () => {
  it('uses catalog when code matches', () => {
    const e = new AdminApiError('Только DRAFT можно approve', 400, 'VENUE_APPROVE_NOT_DRAFT');
    const d = getAdminErrorDisplay(e);
    expect(d.title).toContain('черновика');
    expect(d.code).toBe('VENUE_APPROVE_NOT_DRAFT');
  });

  it('falls back to message for unknown code', () => {
    const e = new AdminApiError('Custom text', 400, 'UNKNOWN_XYZ');
    const d = getAdminErrorDisplay(e);
    expect(d.title).toBe('Custom text');
  });

  it('handles generic Error', () => {
    expect(getAdminErrorMessage(new Error('fail'))).toBe('fail');
  });
});

describe('getBatchResultItemLabel', () => {
  it('uses catalog for known code', () => {
    const s = getBatchResultItemLabel('VENUE_APPROVE_NOT_DRAFT', 'raw');
    expect(s).toContain('черновика');
  });

  it('uses catalog for VENUE_STALE_STATE', () => {
    const s = getBatchResultItemLabel('VENUE_STALE_STATE', 'raw');
    expect(s).toContain('Запись изменилась');
  });

  it('uses catalog for VENUE_SLUG_TAKEN', () => {
    const s = getBatchResultItemLabel('VENUE_SLUG_TAKEN', 'x');
    expect(s).toContain('Slug');
  });

  it('uses catalog for VENUE_BATCH_APPROVE_PREVIEW_LIMIT_EXCEEDED', () => {
    const s = getBatchResultItemLabel('VENUE_BATCH_APPROVE_PREVIEW_LIMIT_EXCEEDED', 'x');
    expect(s).toContain('предпросмотра');
  });

  it('falls back to message', () => {
    expect(getBatchResultItemLabel(undefined, 'Ошибка slug')).toBe('Ошибка slug');
  });
});

describe('getAdminErrorDisplay — venue Stage 3 codes', () => {
  it('maps VENUE_STALE_STATE to catalog', () => {
    const e = new AdminApiError('x', 409, 'VENUE_STALE_STATE');
    const d = getAdminErrorDisplay(e);
    expect(d.code).toBe('VENUE_STALE_STATE');
    expect(d.title).toContain('Запись изменилась');
    expect(d.description).toBeDefined();
  });
});
