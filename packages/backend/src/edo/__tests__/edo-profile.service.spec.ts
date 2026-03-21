/**
 * P4: Тесты EdoProfileService.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EdoProfileService } from '../services/edo-profile.service';
import { EdoProfileValidationError } from '../domain/edo.errors';

function createMockPrisma() {
  const profiles = new Map<string, Record<string, unknown>>();

  return {
    supplierEdoProfile: {
      findUnique: vi.fn().mockImplementation((args: { where: { operatorId: string } }) => {
        const p = profiles.get(args.where.operatorId);
        return Promise.resolve(p ?? null);
      }),
      upsert: vi.fn().mockImplementation(
        async (args: {
          where: { operatorId: string };
          create: Record<string, unknown>;
          update: Record<string, unknown>;
        }) => {
          const op = args.where.operatorId;
          profiles.set(op, { ...args.create, operatorId: op });
          return profiles.get(op);
        },
      ),
      update: vi.fn().mockImplementation(
        async (args: { where: { operatorId: string }; data: Record<string, unknown> }) => {
          const p = profiles.get(args.where.operatorId);
          if (!p) return null;
          const updated = { ...p, ...args.data };
          profiles.set(args.where.operatorId, updated);
          return updated;
        },
      ),
    },
    profiles,
  };
}

describe('EdoProfileService', () => {
  let service: EdoProfileService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  const OP_ID = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new EdoProfileService(mockPrisma as unknown as import('../../prisma/prisma.service').PrismaService);
  });

  describe('upsertProfile', () => {
    it('создаёт NOOP-профиль без boxId', async () => {
      const result = await service.upsertProfile(OP_ID, {
        provider: 'NOOP',
        inn: '1234567890',
        isActive: true,
      });

      expect(result).toBeDefined();
      expect(mockPrisma.supplierEdoProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { operatorId: OP_ID },
          create: expect.objectContaining({
            provider: 'NOOP',
            inn: '1234567890',
            isActive: true,
            boxId: null,
          }),
        }),
      );
    });

    it('NOOP-профиль без boxId проходит валидацию', async () => {
      await expect(
        service.upsertProfile(OP_ID, {
          provider: 'NOOP',
          inn: '1234567890',
          isActive: true,
        }),
      ).resolves.toBeDefined();
    });

    it('DIADOK с isActive=true и пустым boxId выбрасывает EdoProfileValidationError', async () => {
      await expect(
        service.upsertProfile(OP_ID, {
          provider: 'DIADOK',
          inn: '1234567890',
          isActive: true,
          boxId: undefined,
        }),
      ).rejects.toThrow(EdoProfileValidationError);

      await expect(
        service.upsertProfile(OP_ID, {
          provider: 'DIADOK',
          inn: '1234567890',
          isActive: true,
          boxId: '',
        }),
      ).rejects.toThrow(EdoProfileValidationError);
    });

    it('DIADOK с isActive=true и заполненным boxId проходит', async () => {
      const result = await service.upsertProfile(OP_ID, {
        provider: 'DIADOK',
        inn: '1234567890',
        isActive: true,
        boxId: 'diadok-box-123',
      });

      expect(result).toBeDefined();
      expect(mockPrisma.supplierEdoProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            provider: 'DIADOK',
            boxId: 'diadok-box-123',
          }),
        }),
      );
    });
  });
});
