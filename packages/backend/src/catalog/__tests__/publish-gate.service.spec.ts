import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EventQualityService } from '../event-quality.service';
import { PublishGateService } from '../publish-gate.service';

describe('PublishGateService', () => {
  let quality: { validateForPublish: ReturnType<typeof vi.fn> };
  let gate: PublishGateService;

  beforeEach(() => {
    quality = { validateForPublish: vi.fn() };
    gate = new PublishGateService(quality as unknown as EventQualityService);
  });

  it('marks SUBCATEGORY_VALID as BLOCKING when MISSING_SUBCATEGORY present', async () => {
    quality.validateForPublish.mockResolvedValue({
      isReady: false,
      issues: [{ code: 'MISSING_SUBCATEGORY', message: 'm', field: 'subcategories' }],
    });
    const r = await gate.validateEventForPublish('e1');
    expect(r.result).toBe('BLOCKING');
    const sub = r.checks.find((c) => c.code === 'SUBCATEGORY_VALID');
    expect(sub?.status).toBe('BLOCKING');
  });

  it('marks SUBCATEGORY_VALID as OK when subcategories satisfied', async () => {
    quality.validateForPublish.mockResolvedValue({
      isReady: true,
      issues: [],
    });
    const r = await gate.validateEventForPublish('e1');
    expect(r.result).toBe('OK');
    const sub = r.checks.find((c) => c.code === 'SUBCATEGORY_VALID');
    expect(sub?.status).toBe('OK');
  });

  it('marks SUBCATEGORY_VALID as BLOCKING when TOO_MANY_SUBCATEGORIES present', async () => {
    quality.validateForPublish.mockResolvedValue({
      isReady: false,
      issues: [{ code: 'TOO_MANY_SUBCATEGORIES', message: 'm', field: 'subcategories' }],
    });
    const r = await gate.validateEventForPublish('e1');
    expect(r.result).toBe('BLOCKING');
    const sub = r.checks.find((c) => c.code === 'SUBCATEGORY_VALID');
    expect(sub?.status).toBe('BLOCKING');
  });
});
