import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrderReadService {
  constructor(private readonly prisma: PrismaService) {}

  async listOrdersForUser(userId?: string, email?: string) {
    const or: Array<Record<string, unknown>> = [];
    if (userId) {
      or.push({ userId });
    }
    if (email) {
      or.push({ email });
    }

    return this.prisma.order.findMany({
      where: or.length > 0 ? { OR: or } : undefined,
      orderBy: { purchasedAt: 'desc' },
    });
  }
}

