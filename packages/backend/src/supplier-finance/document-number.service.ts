import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

/** Типы документов с отдельной нумерацией в разрезе оператор/год. */
export type DocumentSequenceType = 'INVOICE' | 'UPD_1' | 'UPD_2' | 'AGENT_REPORT';

@Injectable()
export class DocumentNumberService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * P3.1-3: генератор номеров документов в формате ГГГГ-XXXXXX (год + 6 знаков).
   * Счётчики по (operatorId, year, type); обнуление не выполняется — новый год даёт новую запись.
   */
  async nextNumber(params: { operatorId: string; year: number; type: DocumentSequenceType }): Promise<string> {
    const { operatorId, year, type } = params;

    const seq = await this.prisma.documentSequence.upsert({
      where: {
        operatorId_year_type: {
          operatorId,
          year,
          type,
        },
      },
      update: {
        lastNumber: { increment: 1 },
      },
      create: {
        operatorId,
        year,
        type,
        lastNumber: 1,
      },
    });

    const padded = seq.lastNumber.toString().padStart(6, '0');
    return `${year}-${padded}`;
  }
}

