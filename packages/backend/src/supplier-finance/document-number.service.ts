import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

export type DocumentSequenceType = 'INVOICE' | 'UPD_1' | 'UPD_2';

@Injectable()
export class DocumentNumberService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * P3.1: простой генератор номеров документов в разрезе оператора/года/типа.
   * Пока не подключается к прод-логике, служит каркасом для последующей интеграции.
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

