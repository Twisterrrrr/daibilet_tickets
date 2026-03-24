import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { SupplierInvitationService } from '../supplier-invitation.service';

function mockPrisma(overrides: Record<string, unknown> = {}) {
  const invitationFindUnique = vi.fn();
  const supplierUserFindUnique = vi.fn();
  const supplierUserCreate = vi.fn();
  const invitationUpdate = vi.fn();
  const txInner = {
    supplierUser: { create: supplierUserCreate },
    supplierInvitation: { update: invitationUpdate },
  };
  const prisma = {
    supplierInvitation: { findUnique: invitationFindUnique },
    supplierUser: { findUnique: supplierUserFindUnique },
    $transaction: vi.fn(async (cb: (tx: typeof txInner) => Promise<void>) => {
      await cb(txInner);
    }),
    ...overrides,
  };
  return { prisma, invitationFindUnique, supplierUserFindUnique, supplierUserCreate, invitationUpdate, txInner };
}

describe('SupplierInvitationService.accept', () => {
  it('throws NotFoundException for unknown token', async () => {
    const { prisma, invitationFindUnique } = mockPrisma();
    invitationFindUnique.mockResolvedValue(null);
    const auth = {} as never;
    const svc = new SupplierInvitationService(prisma as never, auth);
    await expect(svc.accept('bad', 'N', 'pw')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequest when already accepted', async () => {
    const { prisma, invitationFindUnique } = mockPrisma();
    invitationFindUnique.mockResolvedValue({
      id: 'i1',
      email: 'a@b.c',
      operatorId: 'op',
      acceptedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
      operator: {},
    });
    const svc = new SupplierInvitationService(prisma as never, {} as never);
    await expect(svc.accept('tok', 'N', 'pw')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequest when expired', async () => {
    const { prisma, invitationFindUnique } = mockPrisma();
    invitationFindUnique.mockResolvedValue({
      id: 'i1',
      email: 'a@b.c',
      operatorId: 'op',
      acceptedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      operator: {},
    });
    const svc = new SupplierInvitationService(prisma as never, {} as never);
    await expect(svc.accept('tok', 'N', 'pw')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws Conflict when email already registered', async () => {
    const { prisma, invitationFindUnique, supplierUserFindUnique } = mockPrisma();
    invitationFindUnique.mockResolvedValue({
      id: 'i1',
      email: 'a@b.c',
      operatorId: 'op',
      acceptedAt: null,
      expiresAt: new Date(Date.now() + 86400000),
      operator: {},
    });
    supplierUserFindUnique.mockResolvedValue({ id: 'u1' });
    const svc = new SupplierInvitationService(prisma as never, {} as never);
    await expect(svc.accept('tok', 'N', 'pw')).rejects.toBeInstanceOf(ConflictException);
  });

  it('accepts valid invitation in transaction', async () => {
    const { prisma, invitationFindUnique, supplierUserFindUnique, invitationUpdate } = mockPrisma();
    invitationFindUnique.mockResolvedValue({
      id: 'i1',
      email: 'new@b.c',
      operatorId: 'op',
      acceptedAt: null,
      expiresAt: new Date(Date.now() + 86400000),
      operator: {},
    });
    supplierUserFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'u-new',
        email: 'new@b.c',
        role: 'CONTENT',
        operatorId: 'op',
      });

    const issueTokensForUser = vi.fn().mockResolvedValue({ accessToken: 'a' });
    const auth = { issueTokensForUser } as never;
    const svc = new SupplierInvitationService(prisma as never, auth);

    const out = await svc.accept('goodtok', 'Name', 'secret12345');
    expect(issueTokensForUser).toHaveBeenCalledWith('u-new', 'new@b.c', 'CONTENT', 'op');
    expect(invitationUpdate).toHaveBeenCalled();
    expect(out).toMatchObject({ accessToken: 'a' });
  });
});
