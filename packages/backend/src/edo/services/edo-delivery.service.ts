import { Injectable } from '@nestjs/common';
import { Prisma } from '@/prisma-client';

import { PrismaService } from '../../prisma/prisma.service';
import { EdoProviderRegistry } from '../providers/edo-provider.registry';
import {
  EdoDocumentNotFoundError,
  EdoDocumentStatusError,
  EdoDeliveryNotFoundError,
  EdoProfileNotFoundError,
  EdoProfileInactiveError,
} from '../domain/edo.errors';
import type { EdoLegalProfileSnapshot, EdoProviderProfile } from '../domain/edo.types';

/** Статусы документа, допускающие отправку в ЭДО. */
const ALLOWED_DOCUMENT_STATUSES = ['GENERATED'];

@Injectable()
export class EdoDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRegistry: EdoProviderRegistry,
  ) {}

  async getDocumentDeliveries(documentId: string) {
    return this.prisma.edoDelivery.findMany({
      where: { supplierDocumentId: documentId },
      orderBy: { createdAt: 'desc' },
      include: {
        edoProfile: { select: { provider: true, inn: true } },
      },
    });
  }

  async createPendingDeliveryForDocument(documentId: string, initiatedByAdminUserId: string | null) {
    const doc = await this.prisma.supplierDocument.findUnique({
      where: { id: documentId },
      include: { report: true },
    });

    if (!doc) {
      throw new EdoDocumentNotFoundError(documentId);
    }

    if (!ALLOWED_DOCUMENT_STATUSES.includes(doc.status)) {
      throw new EdoDocumentStatusError(documentId, doc.status);
    }

    const edoProfile = await this.prisma.supplierEdoProfile.findUnique({
      where: { operatorId: doc.operatorId },
    });

    if (!edoProfile) {
      throw new EdoProfileNotFoundError(doc.operatorId);
    }

    if (!edoProfile.isActive) {
      throw new EdoProfileInactiveError(doc.operatorId);
    }

    const provider = this.providerRegistry.getProvider(edoProfile.provider);

    const delivery = await this.prisma.edoDelivery.create({
      data: {
        supplierDocumentId: documentId,
        supplierEdoProfileId: edoProfile.id,
        provider: edoProfile.provider,
        status: 'PENDING',
        initiatedByAdminUserId: initiatedByAdminUserId ?? undefined,
        lastStatusAt: new Date(),
      },
      include: {
        document: { select: { id: true, title: true, status: true } },
        edoProfile: { select: { provider: true, inn: true } },
      },
    });

    return { delivery, provider };
  }

  /**
   * Отправить документ в ЭДО.
   * Создаёт EdoDelivery (PENDING), вызывает провайдера, обновляет статус.
   */
  async sendDocument(documentId: string, initiatedByAdminUserId: string | null) {
    const { delivery, provider } = await this.createPendingDeliveryForDocument(
      documentId,
      initiatedByAdminUserId,
    );

    const doc = await this.prisma.supplierDocument.findUnique({
      where: { id: documentId },
      include: {
        report: true,
        files: true,
      },
    });

    if (!doc) {
      throw new EdoDocumentNotFoundError(documentId);
    }

    const edoProfile = await this.prisma.supplierEdoProfile.findUnique({
      where: { id: delivery.supplierEdoProfileId },
    });

    if (!edoProfile) {
      throw new EdoProfileNotFoundError(doc.operatorId);
    }

    const snapshot = (doc.report?.legalProfileSnapshot ?? doc.payloadJson) as Record<string, unknown> | null;
    const legalProfile = snapshot?.legalProfile ?? doc.report?.legalProfileSnapshot;
    const lp = legalProfile as EdoLegalProfileSnapshot | null | undefined;

    const providerProfile: EdoProviderProfile = {
      provider: edoProfile.provider,
      boxId: edoProfile.boxId,
      inn: edoProfile.inn,
      kpp: edoProfile.kpp,
      settingsJson: edoProfile.settingsJson as Record<string, unknown> | null,
    };

    const sendParams = {
      deliveryId: delivery.id,
      documentId: doc.id,
      operatorId: doc.operatorId,
      reportId: doc.reportId,
      documentType: doc.type,
      providerProfile,
      supplierDocument: {
        id: doc.id,
        title: doc.title,
        payloadJson: doc.payloadJson,
      },
      legalProfileSnapshot: lp
        ? {
            legalName: (lp as Record<string, unknown>).legalName as string | null | undefined,
            inn: (lp as Record<string, unknown>).inn as string | null | undefined,
            kpp: (lp as Record<string, unknown>).kpp as string | null | undefined,
            legalAddress: (lp as Record<string, unknown>).legalAddress as string | null | undefined,
            taxMode: (lp as Record<string, unknown>).taxMode as string | null | undefined,
          }
        : null,
      files: doc.files.map((f) => ({
        kind: f.kind,
        storageKey: f.storageKey,
        fileName: f.fileName,
        mimeType: f.mimeType,
      })),
    };

    const result = await provider.sendDocument(sendParams);

    const now = new Date();
    const updateData: Prisma.EdoDeliveryUncheckedUpdateInput = {
      providerDeliveryId: result.providerDeliveryId,
      status: result.status,
      errorCode: result.errorCode ?? null,
      errorMessage: result.errorMessage ?? null,
      lastStatusAt: now,
      metaJson: (result.meta ?? undefined) as Prisma.InputJsonValue | undefined,
    };

    if (result.status === 'SENT' || result.status === 'DELIVERED' || result.status === 'SIGNED') {
      updateData.sentAt = now;
    }
    if (result.status === 'DELIVERED' || result.status === 'SIGNED') {
      updateData.deliveredAt = now;
    }
    if (result.status === 'SIGNED') {
      updateData.signedAt = now;
    }
    if (result.status === 'REJECTED') {
      updateData.rejectedAt = now;
    }

    const updated = await this.prisma.edoDelivery.update({
      where: { id: delivery.id },
      data: updateData,
      include: {
        document: { select: { id: true, title: true } },
        edoProfile: { select: { provider: true, inn: true } },
      },
    });

    return {
      delivery: updated,
      providerDeliveryId: result.providerDeliveryId,
      status: result.status,
    };
  }

  async refreshDeliveryStatus(deliveryId: string) {
    const delivery = await this.prisma.edoDelivery.findUnique({
      where: { id: deliveryId },
      include: { edoProfile: true },
    });

    if (!delivery) {
      throw new EdoDeliveryNotFoundError(deliveryId);
    }

    const provider = this.providerRegistry.getProvider(delivery.provider);
    const result = await provider.getDeliveryStatus({
      deliveryId,
      providerDeliveryId: delivery.providerDeliveryId,
      provider: delivery.provider,
    });

    const now = new Date();
    const updateData: Prisma.EdoDeliveryUncheckedUpdateInput = {
      status: result.status,
      lastStatusAt: now,
      metaJson: { ...((delivery.metaJson as Record<string, unknown>) ?? {}), ...(result.meta ?? {}) } as Prisma.InputJsonValue,
    };

    if (result.errorCode != null) {
      updateData.errorCode = result.errorCode;
    }
    if (result.errorMessage != null) {
      updateData.errorMessage = result.errorMessage;
    }
    if (result.deliveredAt != null) {
      updateData.deliveredAt = result.deliveredAt;
    }
    if (result.signedAt != null) {
      updateData.signedAt = result.signedAt;
    }
    if (result.rejectedAt != null) {
      updateData.rejectedAt = result.rejectedAt;
    }
    if (result.status === 'SENT' && !delivery.sentAt) {
      updateData.sentAt = now;
    }

    return this.prisma.edoDelivery.update({
      where: { id: deliveryId },
      data: updateData,
      include: {
        document: { select: { id: true, title: true } },
        edoProfile: { select: { provider: true, inn: true } },
      },
    });
  }

  async retryDelivery(deliveryId: string, initiatedByAdminUserId: string | null) {
    const delivery = await this.prisma.edoDelivery.findUnique({
      where: { id: deliveryId },
      include: { document: true },
    });

    if (!delivery) {
      throw new EdoDeliveryNotFoundError(deliveryId);
    }

    return this.sendDocument(delivery.supplierDocumentId, initiatedByAdminUserId);
  }
}
