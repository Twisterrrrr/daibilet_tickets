import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { AllExceptionsFilter } from '../all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  it('puts requestId from req.id into JSON error body', () => {
    const filter = new AllExceptionsFilter();
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const req = { id: 'req-test-1', url: '/api/x' };
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => req,
      }),
    };
    filter.catch(new HttpException('bad', 400), host as never);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'req-test-1',
        error: expect.any(String),
      }),
    );
  });

  it('generates requestId when req.id is missing', () => {
    const filter = new AllExceptionsFilter();
    const bodies: unknown[] = [];
    const json = vi.fn((b: unknown) => bodies.push(b));
    const status = vi.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/a' }),
      }),
    };
    filter.catch(new HttpException('e1', 400), host as never);
    filter.catch(new HttpException('e2', 400), host as never);
    const id0 = (bodies[0] as { requestId: string }).requestId;
    const id1 = (bodies[1] as { requestId: string }).requestId;
    expect(typeof id0).toBe('string');
    expect(id0.length).toBeGreaterThan(8);
    expect(id1).not.toBe(id0);
  });
});
