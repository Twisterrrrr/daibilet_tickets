/**
 * ReportService — query layer for reports (O1).
 * Sales, Refunds, Commissions, Voucher Register. RBAC scope via operatorId/supplierId.
 */
import { Injectable } from '@nestjs/common';

import type { ProviderKind } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export interface ReportScope {
  operatorId?: string | null;
  supplierId?: string | null;
  provider?: ProviderKind | null;
}

export interface SalesRow {
  date: string;
  ticketId: string;
  offerId: string;
  sessionId: string | null;
  voucherCode: string | null;
  grossCents: number;
  commissionCents: number;
  operatorId: string | null;
  supplierId: string | null;
}

export interface RefundsRow {
  date: string;
  refundId: string;
  ticketId: string | null;
  packageId: string | null;
  requestedCents: number | null;
  approvedCents: number | null;
  status: string;
}

export interface VoucherRow {
  voucherCode: string;
  ticketId: string;
  issuedAt: string;
  status: string;
  grossCents: number;
}

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async sales(periodFrom: Date, periodTo: Date, scope: ReportScope): Promise<SalesRow[]> {
    const where: Record<string, unknown> = {
      issuedAt: { gte: periodFrom, lte: periodTo },
      status: 'ISSUED',
    };
    if (scope.operatorId) where.operatorId = scope.operatorId;
    if (scope.supplierId) where.supplierId = scope.supplierId;
    if (scope.provider) where.provider = scope.provider;

    const rows = await this.prisma.ticketIssued.findMany({
      where,
      select: {
        id: true,
        issuedAt: true,
        offerId: true,
        sessionId: true,
        voucherCode: true,
        grossCents: true,
        commissionCents: true,
        operatorId: true,
        supplierId: true,
      },
      orderBy: { issuedAt: 'asc' },
    });
    return rows.map((r) => ({
      date: r.issuedAt.toISOString().slice(0, 10),
      ticketId: r.id,
      offerId: r.offerId,
      sessionId: r.sessionId,
      voucherCode: r.voucherCode,
      grossCents: r.grossCents,
      commissionCents: r.commissionCents,
      operatorId: r.operatorId,
      supplierId: r.supplierId,
    }));
  }

  async refunds(periodFrom: Date, periodTo: Date, scope: ReportScope): Promise<RefundsRow[]> {
    const where: Record<string, unknown> = {
      createdAt: { gte: periodFrom, lte: periodTo },
    };
    if (scope.operatorId) where.operatorId = scope.operatorId;
    if (scope.supplierId) where.supplierId = scope.supplierId;

    const rows = await this.prisma.refundRequest.findMany({
      where,
      select: {
        id: true,
        createdAt: true,
        ticketId: true,
        packageId: true,
        requestedAmountCents: true,
        approvedAmountCents: true,
        status: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({
      date: r.createdAt.toISOString().slice(0, 10),
      refundId: r.id,
      ticketId: r.ticketId,
      packageId: r.packageId,
      requestedCents: r.requestedAmountCents,
      approvedCents: r.approvedAmountCents,
      status: r.status,
    }));
  }

  async commissions(periodFrom: Date, periodTo: Date, scope: ReportScope): Promise<SalesRow[]> {
    return this.sales(periodFrom, periodTo, scope);
  }

  async voucherRegister(periodFrom: Date, periodTo: Date, scope: ReportScope): Promise<VoucherRow[]> {
    const where: Record<string, unknown> = {
      issuedAt: { gte: periodFrom, lte: periodTo },
    };
    if (scope.operatorId) where.operatorId = scope.operatorId;
    if (scope.supplierId) where.supplierId = scope.supplierId;

    const rows = await this.prisma.ticketIssued.findMany({
      where,
      select: {
        voucherCode: true,
        id: true,
        issuedAt: true,
        status: true,
        grossCents: true,
      },
      orderBy: { issuedAt: 'asc' },
    });
    return rows
      .filter((r) => r.voucherCode)
      .map((r) => ({
        voucherCode: r.voucherCode!,
        ticketId: r.id,
        issuedAt: r.issuedAt.toISOString(),
        status: r.status,
        grossCents: r.grossCents,
      }));
  }
}
