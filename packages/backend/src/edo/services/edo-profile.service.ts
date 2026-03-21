import { Injectable } from '@nestjs/common';
import { EdoProviderType } from '@prisma/client';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { EdoProfileNotFoundError, EdoProfileValidationError } from '../domain/edo.errors';
import type { UpsertSupplierEdoProfileDto } from '../dto/upsert-supplier-edo-profile.dto';

@Injectable()
export class EdoProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getByOperatorId(operatorId: string) {
    return this.prisma.supplierEdoProfile.findUnique({
      where: { operatorId },
      include: {
        operator: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  /**
   * Валидация: для DIADOK при isActive=true boxId обязателен.
   */
  private validateUpsert(dto: UpsertSupplierEdoProfileDto): void {
    if (dto.provider === 'DIADOK' && dto.isActive) {
      if (!dto.boxId || !String(dto.boxId).trim()) {
        throw new EdoProfileValidationError('Для провайдера DIADOK с активным профилем boxId обязателен');
      }
    }
  }

  async upsertProfile(operatorId: string, dto: UpsertSupplierEdoProfileDto) {
    this.validateUpsert(dto);

    const data: Prisma.SupplierEdoProfileUncheckedCreateInput = {
      operatorId,
      provider: dto.provider,
      boxId: dto.boxId ?? null,
      inn: dto.inn,
      kpp: dto.kpp ?? null,
      isActive: dto.isActive,
      settingsJson: (dto.settingsJson ?? undefined) as Prisma.InputJsonValue | undefined,
    };

    return this.prisma.supplierEdoProfile.upsert({
      where: { operatorId },
      create: data,
      update: {
        provider: data.provider,
        boxId: data.boxId,
        inn: data.inn,
        kpp: data.kpp,
        isActive: data.isActive,
        settingsJson: (dto.settingsJson ?? undefined) as Prisma.InputJsonValue | undefined,
      },
      include: {
        operator: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async deactivateProfile(operatorId: string) {
    const existing = await this.prisma.supplierEdoProfile.findUnique({
      where: { operatorId },
    });

    if (!existing) {
      throw new EdoProfileNotFoundError(operatorId);
    }

    return this.prisma.supplierEdoProfile.update({
      where: { operatorId },
      data: { isActive: false },
      include: {
        operator: { select: { id: true, name: true, slug: true } },
      },
    });
  }
}
