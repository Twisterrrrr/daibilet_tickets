import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';

import { SUPPLIER_ROLES_KEY, SupplierRolesGuard } from '../supplier.guard';

function ctx(user: { type?: string; role?: string } | null): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('SupplierRolesGuard', () => {
  it('allows when no @SupplierRoles metadata', () => {
    const ref = { getAllAndOverride: vi.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const g = new SupplierRolesGuard(ref);
    expect(g.canActivate(ctx({ type: 'supplier', role: 'CONTENT' }))).toBe(true);
  });

  it('allows matching role', () => {
    const ref = {
      getAllAndOverride: vi.fn().mockReturnValue(['OWNER', 'MANAGER']),
    } as unknown as Reflector;
    const g = new SupplierRolesGuard(ref);
    expect(g.canActivate(ctx({ type: 'supplier', role: 'MANAGER' }))).toBe(true);
  });

  it('throws FORBIDDEN_INSUFFICIENT_ROLE when role mismatch', () => {
    const ref = { getAllAndOverride: vi.fn().mockReturnValue(['OWNER']) } as unknown as Reflector;
    const g = new SupplierRolesGuard(ref);
    expect(() => g.canActivate(ctx({ type: 'supplier', role: 'CONTENT' }))).toThrow(ForbiddenException);
  });

  it('uses SUPPLIER_ROLES_KEY', () => {
    expect(SUPPLIER_ROLES_KEY).toBe('supplier_roles');
  });
});
