import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, SupplierDisputeStatus, SupplierDisputeReasonCategory } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SupplierDisputeService {
  constructor(private readonly prisma: PrismaService) {}

  async openDispute(params: {
    reportId: string;
    operatorId: string;
    reasonCategory: SupplierDisputeReasonCategory;
    reasonText?: string;
    openedBySupplierUserId?: string;
  }) {
    const report = await this.prisma.supplierReport.findUnique({
      where: { id: params.reportId },
    });

    if (!report || report.operatorId !== params.operatorId) {
      throw new BadRequestException('Report not found');
    }

    const existing = await this.prisma.supplierDispute.findFirst({
      where: {
        supplierReportId: params.reportId,
        status: { in: ['OPEN', 'UNDER_REVIEW'] },
      },
    });

    if (existing) {
      throw new BadRequestException('Dispute already open for this report');
    }

    return this.prisma.$transaction(async (tx) => {
      const dispute = await tx.supplierDispute.create({
        data: {
          supplierReportId: params.reportId,
          operatorId: params.operatorId,
          status: 'OPEN',
          reasonCategory: params.reasonCategory,
          reasonText: params.reasonText,
          openedBySupplierUserId: params.openedBySupplierUserId,
        },
      });

      // При открытии спора отчёт де-факто считается DISPUTED, но дата акцепта не обнуляется.
      const existingMeta = (report.metaJson as Prisma.JsonObject | null) ?? {};
      const history: Prisma.InputJsonValue[] = Array.isArray((existingMeta as any).history)
        ? ([...(existingMeta as any).history] as Prisma.InputJsonValue[])
        : [];

      history.push({
        status: 'DISPUTED',
        changedAt: new Date().toISOString(),
        changedByUserId: params.openedBySupplierUserId ?? null,
        changedByRole: 'SUPPLIER',
        comment: params.reasonText ?? null,
      } as unknown as Prisma.InputJsonValue);

      await tx.supplierReport.update({
        where: { id: params.reportId },
        data: {
          metaJson: {
            ...existingMeta,
            disputeStatus: dispute.status,
            disputeId: dispute.id,
            history,
          } as Prisma.InputJsonValue,
        },
      });

      await tx.supplierPayoutRequest.updateMany({
        where: {
          operatorId: params.operatorId,
          status: { in: ['NEW', 'APPROVED'] },
        },
        data: {
          isBlockedByDispute: true,
        },
      });

      return dispute;
    });
  }

  async resolveDispute(params: {
    disputeId: string;
    resolvedByAdminId: string;
    status: Exclude<SupplierDisputeStatus, 'OPEN' | 'UNDER_REVIEW'>;
    resolutionText?: string;
  }) {
    const dispute = await this.prisma.supplierDispute.findUnique({
      where: { id: params.disputeId },
    });

    if (!dispute) {
      throw new BadRequestException('Dispute not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.supplierDispute.update({
        where: { id: params.disputeId },
        data: {
          status: params.status,
          resolutionText: params.resolutionText,
          resolvedByAdminId: params.resolvedByAdminId,
          resolvedAt: new Date(),
        },
      });

      const report = await tx.supplierReport.findUnique({
        where: { id: dispute.supplierReportId },
      });

      if (report) {
        const existingMeta = (report.metaJson as Prisma.JsonObject | null) ?? {};
        const history: Prisma.InputJsonValue[] = Array.isArray((existingMeta as any).history)
          ? ([...(existingMeta as any).history] as Prisma.InputJsonValue[])
          : [];

        history.push({
          status: updated.status,
          changedAt: new Date().toISOString(),
          changedByUserId: params.resolvedByAdminId,
          changedByRole: 'ADMIN',
          comment: params.resolutionText ?? null,
        } as unknown as Prisma.InputJsonValue);

        await tx.supplierReport.update({
          where: { id: dispute.supplierReportId },
          data: {
            metaJson: {
              ...existingMeta,
              disputeStatus: updated.status,
              disputeId: updated.id,
              history,
            } as Prisma.InputJsonValue,
          },
        });
      }

      await tx.supplierPayoutRequest.updateMany({
        where: { operatorId: dispute.operatorId },
        data: {
          isBlockedByDispute: false,
        },
      });

      return updated;
    });
  }
}

