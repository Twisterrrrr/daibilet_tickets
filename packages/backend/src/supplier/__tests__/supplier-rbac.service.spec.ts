import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { SupplierRbacService } from '../supplier-rbac.service';

describe('SupplierRbacService', () => {
  it('hasSupplierRole is true when membership matches', async () => {
    const prisma = {
      supplierUser: {
        findFirst: vi.fn().mockResolvedValue({ id: 'u1', role: 'CONTENT', operatorId: 'op' }),
      },
    };
    const svc = new SupplierRbacService(prisma as never);
    expect(await svc.hasSupplierRole('u1', 'op', ['CONTENT'])).toBe(true);
    expect(await svc.hasSupplierRole('u1', 'op', ['OWNER'])).toBe(false);
  });

  it('requireSupplierRole throws when role missing', async () => {
    const prisma = {
      supplierUser: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const svc = new SupplierRbacService(prisma as never);
    await expect(svc.requireSupplierRole('u', 'op', ['OWNER'])).rejects.toBeInstanceOf(ForbiddenException);
  });
});
