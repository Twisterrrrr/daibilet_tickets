import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';

import { ROLES_KEY, RolesGuard } from '../roles.guard';

function mockContext(user: { role?: string } | null): ExecutionContext {
  return {
    getHandler: () => ({} as object),
    getClass: () => ({} as object),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('пускает ADMIN когда требуется ADMIN', () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(['ADMIN']) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(mockContext({ role: 'ADMIN' }))).toBe(true);
  });

  it('блокирует VIEWER когда требуется только ADMIN', () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(['ADMIN']) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(mockContext({ role: 'VIEWER' }))).toBe(false);
  });

  it('пускает EDITOR когда роли ADMIN и EDITOR', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(['ADMIN', 'EDITOR']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(mockContext({ role: 'EDITOR' }))).toBe(true);
  });

  it('без @Roles пускает любого с user.role', () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(mockContext({ role: 'VIEWER' }))).toBe(true);
  });

  it('использует ключ ROLES_KEY', () => {
    expect(ROLES_KEY).toBe('roles');
  });
});
