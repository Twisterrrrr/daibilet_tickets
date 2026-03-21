/**
 * P4: Тесты EdoDeliveryService.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NoopEdoProvider } from '../providers/noop-edo.provider';
import { EdoDeliveryService } from '../services/edo-delivery.service';
import {
  EdoDocumentNotFoundError,
  EdoDocumentStatusError,
  EdoProfileNotFoundError,
  EdoProfileInactiveError,
  EdoDeliveryNotFoundError,
} from '../domain/edo.errors';

const OP_ID = '00000000-0000-0000-0000-000000000001';
const DOC_ID = 'doc-cuid-123';
const PROFILE_ID = 'profile-cuid-456';

function createMockPrisma() {
  const documents = new Map<string, Record<string, unknown>>();
  const profiles = new Map<string, Record<string, unknown>>();
  const deliveries = new Map<string, Record<string, unknown>>();
  let deliveryCounter = 0;

  const mockDeliveryCreate = vi.fn().mockImplementation(async (args: { data: Record<string, unknown> }) => {
    const id = `delivery-${++deliveryCounter}`;
    const rec = { id, ...args.data, createdAt: new Date(), updatedAt: new Date() };
    deliveries.set(id, rec);
    return rec;
  });

  const mockDeliveryUpdate = vi.fn().mockImplementation(async (args: { where: { id: string }; data: Record<string, unknown> }) => {
    const rec = deliveries.get(args.where.id);
    if (!rec) return null;
    const updated = { ...rec, ...args.data };
    deliveries.set(args.where.id, updated);
    return updated;
  });

  return {
    supplierDocument: {
      findUnique: vi.fn().mockImplementation((args: { where: { id: string }; include?: unknown }) => {
        const doc = documents.get(args.where.id);
        return Promise.resolve(doc ?? null);
      }),
    },
    supplierEdoProfile: {
      findUnique: vi.fn().mockImplementation((args: { where: { operatorId?: string; id?: string } }) => {
        const key = args.where.operatorId ?? args.where.id;
        const p = key ? profiles.get(key) : null;
        return Promise.resolve(p ?? null);
      }),
    },
    edoDelivery: {
      findMany: vi.fn().mockImplementation((args: { where: { supplierDocumentId: string } }) => {
        const list = Array.from(deliveries.values()).filter(
          (d) => (d as Record<string, unknown>).supplierDocumentId === args.where.supplierDocumentId,
        );
        return Promise.resolve(list);
      }),
      findUnique: vi.fn().mockImplementation((args: { where: { id: string }; include?: unknown }) => {
        const d = deliveries.get(args.where.id);
        return Promise.resolve(d ?? null);
      }),
      create: mockDeliveryCreate,
      update: mockDeliveryUpdate,
    },
    supplierReport: { findUnique: vi.fn().mockResolvedValue(null) },
    // Helpers
    _setDocument: (id: string, doc: Record<string, unknown>) => {
      documents.set(id, doc);
    },
    _setProfile: (operatorId: string, profile: Record<string, unknown>) => {
      profiles.set(operatorId, profile);
      profiles.set(profile.id as string, profile);
    },
    _setDelivery: (id: string, d: Record<string, unknown>) => {
      deliveries.set(id, d);
    },
    _deliveries: () => deliveries,
  };
}

function createMockRegistry() {
  const noop = new NoopEdoProvider();
  return {
    getProvider: vi.fn().mockReturnValue(noop),
  };
}

describe('EdoDeliveryService', () => {
  let service: EdoDeliveryService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockRegistry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockRegistry = createMockRegistry();
    service = new EdoDeliveryService(
      mockPrisma as unknown as import('../../prisma/prisma.service').PrismaService,
      mockRegistry as unknown as import('../providers/edo-provider.registry').EdoProviderRegistry,
    );
  });

  describe('sendDocument', () => {
    it('fail when document not found', async () => {
      mockPrisma._setProfile(OP_ID, {
        id: PROFILE_ID,
        operatorId: OP_ID,
        provider: 'NOOP',
        isActive: true,
        inn: '1234567890',
      });

      await expect(service.sendDocument('nonexistent', null)).rejects.toThrow(EdoDocumentNotFoundError);
    });

    it('fail when document status is DRAFT', async () => {
      mockPrisma._setDocument(DOC_ID, {
        id: DOC_ID,
        operatorId: OP_ID,
        reportId: 'rep-1',
        status: 'DRAFT',
        type: 'AGENT_REPORT',
        title: 'Test',
        payloadJson: {},
        report: null,
        files: [],
      });
      mockPrisma._setProfile(OP_ID, {
        id: PROFILE_ID,
        operatorId: OP_ID,
        provider: 'NOOP',
        isActive: true,
        inn: '1234567890',
      });

      await expect(service.sendDocument(DOC_ID, null)).rejects.toThrow(EdoDocumentStatusError);
    });

    it('fail when no SupplierEdoProfile', async () => {
      mockPrisma._setDocument(DOC_ID, {
        id: DOC_ID,
        operatorId: OP_ID,
        reportId: 'rep-1',
        status: 'GENERATED',
        type: 'AGENT_REPORT',
        title: 'Test',
        payloadJson: {},
        report: null,
        files: [],
      });
      // No profile

      await expect(service.sendDocument(DOC_ID, null)).rejects.toThrow(EdoProfileNotFoundError);
    });

    it('fail when profile inactive', async () => {
      mockPrisma._setDocument(DOC_ID, {
        id: DOC_ID,
        operatorId: OP_ID,
        reportId: 'rep-1',
        status: 'GENERATED',
        type: 'AGENT_REPORT',
        title: 'Test',
        payloadJson: {},
        report: null,
        files: [],
      });
      mockPrisma._setProfile(OP_ID, {
        id: PROFILE_ID,
        operatorId: OP_ID,
        provider: 'NOOP',
        isActive: false,
        inn: '1234567890',
      });

      await expect(service.sendDocument(DOC_ID, null)).rejects.toThrow(EdoProfileInactiveError);
    });

    it('creates EdoDelivery with NOOP provider and returns SENT', async () => {
      mockPrisma._setDocument(DOC_ID, {
        id: DOC_ID,
        operatorId: OP_ID,
        reportId: 'rep-1',
        status: 'GENERATED',
        type: 'AGENT_REPORT',
        title: 'Test',
        payloadJson: {},
        report: null,
        files: [],
      });
      mockPrisma._setProfile(OP_ID, {
        id: PROFILE_ID,
        operatorId: OP_ID,
        provider: 'NOOP',
        isActive: true,
        inn: '1234567890',
        boxId: null,
        kpp: null,
        settingsJson: null,
      });

      const prismaDoc = mockPrisma.supplierDocument.findUnique as ReturnType<typeof vi.fn>;
      prismaDoc.mockImplementation(async (args: { where: { id: string }; include?: unknown }) => {
        if (args.where.id === DOC_ID) {
          return {
            id: DOC_ID,
            operatorId: OP_ID,
            reportId: 'rep-1',
            status: 'GENERATED',
            type: 'AGENT_REPORT',
            title: 'Test',
            payloadJson: {},
            report: null,
            files: [],
          };
        }
        return null;
      });

      const prismaProfile = mockPrisma.supplierEdoProfile.findUnique as ReturnType<typeof vi.fn>;
      prismaProfile.mockImplementation(async (args: { where: { operatorId?: string; id?: string } }) => {
        const key = args.where.operatorId ?? args.where.id;
        if (key === OP_ID || key === PROFILE_ID) {
          return {
            id: PROFILE_ID,
            operatorId: OP_ID,
            provider: 'NOOP',
            isActive: true,
            inn: '1234567890',
            boxId: null,
            kpp: null,
            settingsJson: null,
          };
        }
        return null;
      });

      const result = await service.sendDocument(DOC_ID, 'admin-user-id');

      expect(result.status).toBe('SENT');
      expect(result.providerDeliveryId).toMatch(/^noop_/);
      expect(mockPrisma.edoDelivery.create).toHaveBeenCalled();
      expect(mockPrisma.edoDelivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'SENT',
            providerDeliveryId: expect.stringMatching(/^noop_/),
          }),
        }),
      );
    });

    it('repeated send creates second EdoDelivery', async () => {
      mockPrisma._setDocument(DOC_ID, {
        id: DOC_ID,
        operatorId: OP_ID,
        reportId: 'rep-1',
        status: 'GENERATED',
        type: 'AGENT_REPORT',
        title: 'Test',
        payloadJson: {},
        report: null,
        files: [],
      });
      mockPrisma._setProfile(OP_ID, {
        id: PROFILE_ID,
        operatorId: OP_ID,
        provider: 'NOOP',
        isActive: true,
        inn: '1234567890',
        boxId: null,
        kpp: null,
        settingsJson: null,
      });

      const prismaDoc = mockPrisma.supplierDocument.findUnique as ReturnType<typeof vi.fn>;
      prismaDoc.mockResolvedValue({
        id: DOC_ID,
        operatorId: OP_ID,
        reportId: 'rep-1',
        status: 'GENERATED',
        type: 'AGENT_REPORT',
        title: 'Test',
        payloadJson: {},
        report: null,
        files: [],
      });

      const prismaProfile = mockPrisma.supplierEdoProfile.findUnique as ReturnType<typeof vi.fn>;
      prismaProfile.mockResolvedValue({
        id: PROFILE_ID,
        operatorId: OP_ID,
        provider: 'NOOP',
        isActive: true,
        inn: '1234567890',
        boxId: null,
        kpp: null,
        settingsJson: null,
      });

      await service.sendDocument(DOC_ID, null);
      await service.sendDocument(DOC_ID, null);

      expect(mockPrisma.edoDelivery.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('refreshDeliveryStatus', () => {
    it('fail when delivery not found', async () => {
      await expect(service.refreshDeliveryStatus('nonexistent')).rejects.toThrow(EdoDeliveryNotFoundError);
    });

    it('updates delivery status for NOOP', async () => {
      mockPrisma._setDelivery('del-1', {
        id: 'del-1',
        supplierDocumentId: DOC_ID,
        supplierEdoProfileId: PROFILE_ID,
        provider: 'NOOP',
        providerDeliveryId: 'noop_del-1',
        status: 'SENT',
        metaJson: {},
      });

      const prismaFind = mockPrisma.edoDelivery.findUnique as ReturnType<typeof vi.fn>;
      prismaFind.mockResolvedValue({
        id: 'del-1',
        supplierDocumentId: DOC_ID,
        supplierEdoProfileId: PROFILE_ID,
        provider: 'NOOP',
        providerDeliveryId: 'noop_del-1',
        status: 'SENT',
        metaJson: {},
        edoProfile: { provider: 'NOOP' },
      });

      const result = await service.refreshDeliveryStatus('del-1');

      expect(result).toBeDefined();
      expect(mockPrisma.edoDelivery.update).toHaveBeenCalled();
    });
  });
});
