/**
 * P3.1-3: Юнит-тесты нумерации документов.
 * Проверки: изоляция по operatorId, смена года (новая запись = счётчик с 1), независимые последовательности по типу, формат YYYY-XXXXXX.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DocumentSequenceType } from '../document-number.service';
import { DocumentNumberService } from '../document-number.service';

function createMockPrisma() {
  const counters = new Map<string, number>();

  const keyOf = (operatorId: string, year: number, type: string) => `${operatorId}:${year}:${type}`;

  return {
    documentSequence: {
      upsert: vi.fn().mockImplementation(
        async (args: {
          where: { operatorId_year_type: { operatorId: string; year: number; type: string } };
          update: { lastNumber: { increment: number } };
          create: { operatorId: string; year: number; type: string; lastNumber: number };
        }) => {
          const { operatorId, year, type } = args.where.operatorId_year_type;
          const key = keyOf(operatorId, year, type);
          const current = counters.get(key) ?? 0;
          const next = current + 1;
          counters.set(key, next);
          return { operatorId, year, type, lastNumber: next };
        },
      ),
    },
    counters,
  };
}

describe('DocumentNumberService.nextNumber (P3.1-3)', () => {
  let service: DocumentNumberService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  const OP_A = '00000000-0000-0000-0000-000000000001';
  const OP_B = '00000000-0000-0000-0000-000000000002';

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new DocumentNumberService(mockPrisma as unknown as import('../../prisma/prisma.service').PrismaService);
  });

  describe('формат строки YYYY-XXXXXX', () => {
    it('возвращает строку вида год-6_знаков (например 2024-000001)', async () => {
      const result = await service.nextNumber({ operatorId: OP_A, year: 2024, type: 'AGENT_REPORT' });
      expect(result).toMatch(/^\d{4}-\d{6}$/);
      expect(result).toBe('2024-000001');
    });

    it('дополняет номер нулями слева до 6 знаков', async () => {
      const result = await service.nextNumber({ operatorId: OP_A, year: 2024, type: 'AGENT_REPORT' });
      const [, num] = result.split('-');
      expect(num.length).toBe(6);
      expect(num).toBe('000001');
    });
  });

  describe('изоляция по operatorId', () => {
    it('разные операторы получают независимые счётчики (каждый начинает с 1)', async () => {
      const numA1 = await service.nextNumber({ operatorId: OP_A, year: 2024, type: 'AGENT_REPORT' });
      const numB1 = await service.nextNumber({ operatorId: OP_B, year: 2024, type: 'AGENT_REPORT' });
      expect(numA1).toBe('2024-000001');
      expect(numB1).toBe('2024-000001');
    });

    it('счётчик оператора A не влияет на следующий номер оператора B', async () => {
      await service.nextNumber({ operatorId: OP_A, year: 2024, type: 'AGENT_REPORT' });
      await service.nextNumber({ operatorId: OP_A, year: 2024, type: 'AGENT_REPORT' });
      const numB = await service.nextNumber({ operatorId: OP_B, year: 2024, type: 'AGENT_REPORT' });
      expect(numB).toBe('2024-000001');
    });
  });

  describe('смена года', () => {
    it('новый год даёт новую последовательность, первый номер в году — 000001', async () => {
      await service.nextNumber({ operatorId: OP_A, year: 2024, type: 'AGENT_REPORT' });
      await service.nextNumber({ operatorId: OP_A, year: 2024, type: 'AGENT_REPORT' });
      const firstOf2025 = await service.nextNumber({ operatorId: OP_A, year: 2025, type: 'AGENT_REPORT' });
      expect(firstOf2025).toBe('2025-000001');
    });

    it('переход 2024 → 2025 не сбивает формат (год в префиксе совпадает с переданным)', async () => {
      const r2024 = await service.nextNumber({ operatorId: OP_A, year: 2024, type: 'AGENT_REPORT' });
      const r2025 = await service.nextNumber({ operatorId: OP_A, year: 2025, type: 'AGENT_REPORT' });
      expect(r2024.startsWith('2024-')).toBe(true);
      expect(r2025.startsWith('2025-')).toBe(true);
    });
  });

  describe('независимые последовательности по типу документа', () => {
    it('AGENT_REPORT и INVOICE для одного оператора и года имеют свои счётчики', async () => {
      const agent1 = await service.nextNumber({ operatorId: OP_A, year: 2024, type: 'AGENT_REPORT' });
      const inv1 = await service.nextNumber({ operatorId: OP_A, year: 2024, type: 'INVOICE' });
      expect(agent1).toBe('2024-000001');
      expect(inv1).toBe('2024-000001');
    });

    it('последовательные вызовы одного типа инкрементируют только свой счётчик', async () => {
      const types: DocumentSequenceType[] = ['AGENT_REPORT', 'UPD_1', 'INVOICE'];
      for (const type of types) {
        const n1 = await service.nextNumber({ operatorId: OP_A, year: 2024, type });
        const n2 = await service.nextNumber({ operatorId: OP_A, year: 2024, type });
        expect(n1).toBe('2024-000001');
        expect(n2).toBe('2024-000002');
      }
    });
  });

  describe('вызов upsert с корректными параметрами', () => {
    it('передаёт в upsert operatorId, year, type из аргументов', async () => {
      await service.nextNumber({ operatorId: OP_A, year: 2024, type: 'UPD_2' });
      expect(mockPrisma.documentSequence.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            operatorId_year_type: { operatorId: OP_A, year: 2024, type: 'UPD_2' },
          },
          update: { lastNumber: { increment: 1 } },
          create: expect.objectContaining({
            operatorId: OP_A,
            year: 2024,
            type: 'UPD_2',
            lastNumber: 1,
          }),
        }),
      );
    });
  });
});
