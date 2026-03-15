import { Injectable } from '@nestjs/common';
import { EventSource } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export interface IntegrationStatus {
  id: string;
  name: string;
  status: 'connected' | 'none';
  eventCount: number;
  description?: string;
}

@Injectable()
export class SupplierIntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(operatorId: string): Promise<{ integrations: IntegrationStatus[] }> {
    const [tcCount, tepCount, manualCount, apiKeyCount] = await Promise.all([
      this.prisma.event.count({
        where: { operatorId, source: EventSource.TC, isDeleted: false },
      }),
      this.prisma.event.count({
        where: { operatorId, source: EventSource.TEPLOHOD, isDeleted: false },
      }),
      this.prisma.event.count({
        where: { operatorId, source: EventSource.MANUAL, isDeleted: false },
      }),
      this.prisma.apiKey.count({
        where: { operatorId, isActive: true },
      }),
    ]);

    const integrations: IntegrationStatus[] = [
      {
        id: 'TC',
        name: 'Ticketscloud',
        status: tcCount > 0 ? 'connected' : 'none',
        eventCount: tcCount,
        description: 'События из Ticketscloud (платформенная синхронизация)',
      },
      {
        id: 'TEPLOHOD',
        name: 'Teplohod',
        status: tepCount > 0 ? 'connected' : 'none',
        eventCount: tepCount,
        description: 'События с teplohod.info',
      },
      {
        id: 'PARTNER',
        name: 'Partner API',
        status: apiKeyCount > 0 ? 'connected' : 'none',
        eventCount: 0,
        description: 'B2B API для прямой интеграции',
      },
      {
        id: 'MANUAL',
        name: 'Ручное создание',
        status: 'connected',
        eventCount: manualCount,
        description: 'События, созданные вручную',
      },
    ];

    return { integrations };
  }
}
