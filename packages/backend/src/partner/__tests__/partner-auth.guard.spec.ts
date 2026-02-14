import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ApiKeyGuard } from '../partner-auth.guard';

// ---------------------
// Helpers
// ---------------------

function createMockContext(
  headers: Record<string, string> = {},
  ip = '127.0.0.1',
) {
  const request = {
    headers,
    ip,
    connection: { remoteAddress: ip },
    user: null as any,
  };

  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as any;

  return { request, context };
}

/** A valid API key mock record */
function makeApiKeyRecord(overrides: Record<string, any> = {}) {
  return {
    id: 'k1',
    isActive: true,
    expiresAt: null,
    ipWhitelist: [],
    operatorId: 'op1',
    name: 'Test Key',
    operator: {
      id: 'op1',
      name: 'Test Operator',
      isActive: true,
      isSupplier: false,
      trustLevel: 'BASIC',
    },
    ...overrides,
  };
}

// ---------------------
// Tests
// ---------------------

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;

  const mockPrisma = {
    apiKey: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new ApiKeyGuard(mockPrisma as any);
  });

  // =========================================
  // Authentication: Missing / Invalid header
  // =========================================

  it('should throw UnauthorizedException when no Authorization header', async () => {
    const { context } = createMockContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when Authorization is not Bearer', async () => {
    const { context } = createMockContext({ authorization: 'Basic dbl_test_key_1234567890' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when key does not start with dbl_', async () => {
    const { context } = createMockContext({ authorization: 'Bearer invalid_key_1234567890abcdef' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when key is too short (< 20 chars)', async () => {
    const { context } = createMockContext({ authorization: 'Bearer dbl_short' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  // =========================================
  // Authentication: Key not found in DB
  // =========================================

  it('should throw UnauthorizedException when API key not found in database', async () => {
    const { context } = createMockContext({ authorization: 'Bearer dbl_test_key_1234567890' });
    mockPrisma.apiKey.findUnique.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  // =========================================
  // Authorization: Forbidden scenarios
  // =========================================

  it('should throw ForbiddenException when API key is inactive', async () => {
    const { context } = createMockContext({ authorization: 'Bearer dbl_test_key_1234567890' });
    mockPrisma.apiKey.findUnique.mockResolvedValue(
      makeApiKeyRecord({ isActive: false }),
    );

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when API key is expired', async () => {
    const { context } = createMockContext({ authorization: 'Bearer dbl_test_key_1234567890' });
    mockPrisma.apiKey.findUnique.mockResolvedValue(
      makeApiKeyRecord({ expiresAt: new Date('2020-01-01') }),
    );

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when operator is inactive', async () => {
    const { context } = createMockContext({ authorization: 'Bearer dbl_test_key_1234567890' });
    mockPrisma.apiKey.findUnique.mockResolvedValue(
      makeApiKeyRecord({
        operator: { id: 'op1', name: 'Disabled Op', isActive: false, isSupplier: false, trustLevel: 'BASIC' },
      }),
    );

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when IP not in whitelist', async () => {
    const { context } = createMockContext(
      { authorization: 'Bearer dbl_test_key_1234567890' },
      '10.0.0.1',
    );
    mockPrisma.apiKey.findUnique.mockResolvedValue(
      makeApiKeyRecord({ ipWhitelist: ['192.168.1.1', '192.168.1.2'] }),
    );

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  // =========================================
  // Happy path
  // =========================================

  it('should return true and set request.user on valid key', async () => {
    const { context, request } = createMockContext({
      authorization: 'Bearer dbl_test_key_1234567890',
    });

    mockPrisma.apiKey.findUnique.mockResolvedValue(
      makeApiKeyRecord({
        operator: {
          id: 'op1',
          name: 'Premium Partner',
          isActive: true,
          isSupplier: true,
          trustLevel: 'TRUSTED',
        },
      }),
    );

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toEqual({
      operatorId: 'op1',
      operatorName: 'Premium Partner',
      apiKeyId: 'k1',
      apiKeyName: 'Test Key',
      trustLevel: 'TRUSTED',
      type: 'partner',
    });
  });

  it('should allow access when IP is in the whitelist', async () => {
    const { context } = createMockContext(
      { authorization: 'Bearer dbl_test_key_1234567890' },
      '192.168.1.1',
    );

    mockPrisma.apiKey.findUnique.mockResolvedValue(
      makeApiKeyRecord({ ipWhitelist: ['192.168.1.1', '10.0.0.1'] }),
    );

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should skip IP check when whitelist is empty', async () => {
    const { context } = createMockContext(
      { authorization: 'Bearer dbl_test_key_1234567890' },
      '99.99.99.99',
    );

    mockPrisma.apiKey.findUnique.mockResolvedValue(
      makeApiKeyRecord({ ipWhitelist: [] }),
    );

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should allow non-expired key with future expiresAt', async () => {
    const { context } = createMockContext({
      authorization: 'Bearer dbl_test_key_1234567890',
    });

    mockPrisma.apiKey.findUnique.mockResolvedValue(
      makeApiKeyRecord({ expiresAt: new Date('2099-12-31') }),
    );

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should fire-and-forget lastUsedAt update', async () => {
    const { context } = createMockContext({
      authorization: 'Bearer dbl_test_key_1234567890',
    });

    mockPrisma.apiKey.findUnique.mockResolvedValue(makeApiKeyRecord());

    await guard.canActivate(context);

    // update is called (fire-and-forget, no await in guard code)
    expect(mockPrisma.apiKey.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'k1' },
        data: expect.objectContaining({ lastUsedAt: expect.any(Date) }),
      }),
    );
  });
});
