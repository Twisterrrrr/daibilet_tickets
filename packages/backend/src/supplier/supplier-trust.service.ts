import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import type { Operator, SupplierTrustOverride } from '@/prisma-client';

import { PrismaService } from '../prisma/prisma.service';

/** Без DI: ListingHealthService и др. */
export function computeEffectiveTrustScore(
  baseTrustScore: number,
  override: Pick<SupplierTrustOverride, 'scoreDelta' | 'expiresAt'> | null | undefined,
  now: Date = new Date(),
): number {
  if (!override || override.expiresAt <= now) return baseTrustScore;
  return Math.max(0, Math.min(100, baseTrustScore + override.scoreDelta));
}

export interface SupplierTrustBreakdown {
  profile: number;
  catalog: number;
  operations: number;
  reputation: number;
  stability: number;
  penalties: number;
  score: number;
  level: number;
}

export interface SupplierNextLevelRequirement {
  code: string;
  message: string;
}

@Injectable()
export class SupplierTrustService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Итоговый trust score: базовый trustScore плюс активный админ-override (если не истёк).
   */
  getEffectiveScore(
    supplier: Pick<Operator, 'trustScore'> & { supplierTrustOverride?: SupplierTrustOverride | null },
  ): number {
    return computeEffectiveTrustScore(supplier.trustScore, supplier.supplierTrustOverride ?? null);
  }

  async upsertTrustOverride(
    supplierId: string,
    dto: { scoreDelta: number; reason: string; expiresAt: Date },
  ): Promise<SupplierTrustOverride> {
    const op = await this.prisma.operator.findUnique({
      where: { id: supplierId, isSupplier: true },
      select: { id: true },
    });
    if (!op) throw new NotFoundException('Поставщик не найден');

    return this.prisma.supplierTrustOverride.upsert({
      where: { supplierId },
      create: {
        supplierId,
        scoreDelta: dto.scoreDelta,
        reason: dto.reason,
        expiresAt: dto.expiresAt,
      },
      update: {
        scoreDelta: dto.scoreDelta,
        reason: dto.reason,
        expiresAt: dto.expiresAt,
      },
    });
  }

  async deleteTrustOverride(supplierId: string): Promise<{ deleted: boolean }> {
    const op = await this.prisma.operator.findUnique({
      where: { id: supplierId, isSupplier: true },
      select: { id: true },
    });
    if (!op) throw new NotFoundException('Поставщик не найден');

    const res = await this.prisma.supplierTrustOverride.deleteMany({ where: { supplierId } });
    return { deleted: res.count > 0 };
  }

  async getTrustOverridePayload(supplierId: string): Promise<{
    baseScore: number;
    effectiveScore: number;
    override: null | {
      id: string;
      scoreDelta: number;
      reason: string;
      expiresAt: string;
      createdAt: string;
      active: boolean;
    };
  }> {
    const op = await this.prisma.operator.findUnique({
      where: { id: supplierId, isSupplier: true },
      select: {
        trustScore: true,
        supplierTrustOverride: true,
      },
    });
    if (!op) throw new NotFoundException('Поставщик не найден');

    const now = new Date();
    const ovr = op.supplierTrustOverride;
    const effectiveScore = this.getEffectiveScore({
      trustScore: op.trustScore,
      supplierTrustOverride: ovr,
    });

    return {
      baseScore: op.trustScore,
      effectiveScore,
      override:
        ovr == null
          ? null
          : {
              id: ovr.id,
              scoreDelta: ovr.scoreDelta,
              reason: ovr.reason,
              expiresAt: ovr.expiresAt.toISOString(),
              createdAt: ovr.createdAt.toISOString(),
              active: ovr.expiresAt > now,
            },
    };
  }

  getActiveEventsLimitByTrustLevel(level: number): number {
    if (level >= 3) return 50;
    if (level === 2) return 25;
    if (level === 1) return 10;
    return 5;
  }

  async getActiveEventsCount(operatorId: string): Promise<number> {
    return this.prisma.event.count({
      where: {
        operatorId,
        isActive: true,
        isDeleted: false,
        moderationStatus: { in: ['APPROVED', 'AUTO_APPROVED'] },
      },
    });
  }

  mapScoreToLevel(score: number): number {
    if (score >= 75) return 3;
    if (score >= 50) return 2;
    if (score >= 25) return 1;
    return 0;
  }

  /**
   * Рассчитывает свежий score по доступным сигналам без учёта сглаживания.
   */
  private async calculateFreshBreakdown(operatorId: string): Promise<SupplierTrustBreakdown> {
    const operator = await this.prisma.operator.findUnique({
      where: { id: operatorId },
      include: {
        events: {
          where: { isDeleted: false },
          select: {
            id: true,
            isActive: true,
            imageUrl: true,
            description: true,
            priceFrom: true,
            sessions: { select: { id: true }, take: 1 },
            moderationStatus: true,
          },
        },
      },
    });
    if (!operator) {
      throw new BadRequestException('Operator not found');
    }

    // --- Profile (0..20) ---
    let profile = 0;
    const hasBasicProfile = !!operator.name;
    const hasContacts = !!operator.contactEmail && !!operator.contactPhone;
    const hasCompany = !!operator.companyName && !!operator.inn;
    const hasWebsiteOrRefund = !!operator.website || !!operator.defaultRefundPolicyText;

    if (hasBasicProfile) profile += 5;
    if (hasContacts) profile += 5;
    if (hasCompany) profile += 5;
    if (hasWebsiteOrRefund) profile += 5;

    // --- Catalog (0..25) ---
    const activeEvents = operator.events.filter(
      (e) => e.isActive && ['APPROVED', 'AUTO_APPROVED'].includes(e.moderationStatus),
    );
    let catalog = 0;
    if (activeEvents.length > 0) {
      const withImage = activeEvents.filter((e) => !!e.imageUrl).length / activeEvents.length;
      const withDescription = activeEvents.filter((e) => (e.description || '').trim().length > 100).length /
        activeEvents.length;
      const withSchedule = activeEvents.filter((e) => e.sessions.length > 0).length / activeEvents.length;
      const withPrice = activeEvents.filter((e) => e.priceFrom !== null && e.priceFrom !== undefined).length /
        activeEvents.length;

      if (withImage >= 0.8) catalog += 5;
      if (withSchedule >= 0.8) catalog += 5;
      if (withDescription >= 0.8) catalog += 5;
      if (withPrice >= 0.8) catalog += 5;

      const rejectedEvents = operator.events.filter((e) => e.moderationStatus === 'REJECTED').length;
      if (rejectedEvents === 0) {
        catalog += 5;
      } else if (rejectedEvents / operator.events.length <= 0.1) {
        catalog += 3;
      }
    }

    // --- Operations (simplified MVP, 0..25) ---
    let operations = 0;
    const paid = await this.prisma.paymentIntent.count({
      where: { supplierId: operatorId, status: 'PAID' },
    });
    const refunded = await this.prisma.paymentIntent.count({
      where: { supplierId: operatorId, status: 'REFUNDED' },
    });
    if (paid > 0) {
      const refundRate = refunded / paid;
      if (refundRate <= 0.02) operations += 8;
      else if (refundRate <= 0.05) operations += 5;
    }

    const recentRejected = await this.prisma.event.count({
      where: {
        operatorId,
        moderationStatus: 'REJECTED',
        updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });
    if (recentRejected === 0) operations += 5;
    else if (recentRejected <= 2) operations += 3;

    const oldDrafts = await this.prisma.event.count({
      where: {
        operatorId,
        isActive: false,
        moderationStatus: 'DRAFT',
        createdAt: { lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });
    operations += oldDrafts === 0 ? 4 : 2;

    // --- Reputation (0..15) ---
    let reputation = 0;
    const reviews = await this.prisma.review.findMany({
      where: { supplierId: operatorId, status: 'APPROVED' },
      select: { rating: true },
    });
    if (reviews.length > 0) {
      const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      if (avg >= 4.7) reputation += 6;
      else if (avg >= 4.3) reputation += 4;

      const badShare = reviews.filter((r) => r.rating <= 3).length / reviews.length;
      if (badShare <= 0.05) reputation += 4;
      else if (badShare <= 0.1) reputation += 2;
    }

    // --- Stability (0..15) ---
    let stability = 0;
    const daysSinceCreated = Math.floor(
      (Date.now() - new Date(operator.createdAt).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceCreated >= 14) stability += 4;
    if (daysSinceCreated >= 30) stability += 4;
    if (daysSinceCreated >= 60) stability += 4;
    if (paid > 0) stability += 3;

    // --- Penalties (MVP) ---
    let penalties = 0;
    if (recentRejected >= 3) {
      penalties -= 10;
    }
    const highRefundRate = paid > 0 ? refunded / paid : 0;
    if (highRefundRate > 0.1) {
      penalties -= 10;
    }

    const baseScore = profile + catalog + operations + reputation + stability + penalties;
    const clampedScore = Math.max(0, Math.min(100, baseScore));
    const level = this.mapScoreToLevel(clampedScore);

    return {
      profile,
      catalog,
      operations,
      reputation,
      stability,
      penalties,
      score: clampedScore,
      level,
    };
  }

  async recalculateSupplierTrust(operatorId: string): Promise<SupplierTrustBreakdown> {
    const fresh = await this.calculateFreshBreakdown(operatorId);

    const existing = await this.prisma.operator.findUnique({
      where: { id: operatorId },
      select: { trustScore: true, trustManualOverrideLevel: true, trustManualOverrideScore: true, trustManualExpiresAt: true },
    });

    const now = new Date();
    const manualActive =
      existing?.trustManualOverrideLevel !== null &&
      existing?.trustManualOverrideLevel !== undefined &&
      (!existing.trustManualExpiresAt || existing.trustManualExpiresAt > now);

    const previousScore = existing?.trustScore ?? 0;
    const blendedScore = Math.round(previousScore * 0.7 + fresh.score * 0.3);
    const deltaClamped = Math.max(previousScore - 10, Math.min(previousScore + 10, blendedScore));
    const finalScore = Math.max(0, Math.min(100, deltaClamped));
    const autoLevel = this.mapScoreToLevel(finalScore);
    const finalLevel = manualActive
      ? existing!.trustManualOverrideLevel!
      : autoLevel;

    await this.prisma.operator.update({
      where: { id: operatorId },
      data: {
        trustScore: finalScore,
        trustLevel: finalLevel,
        trustProfileScore: fresh.profile,
        trustCatalogScore: fresh.catalog,
        trustOperationsScore: fresh.operations,
        trustReputationScore: fresh.reputation,
        trustStabilityScore: fresh.stability,
        trustPenaltyScore: fresh.penalties,
        trustLastCalculatedAt: now,
      },
    });

    return {
      ...fresh,
      score: finalScore,
      level: finalLevel,
    };
  }

  async getNextLevelRequirements(operatorId: string): Promise<SupplierNextLevelRequirement[]> {
    const operator = await this.prisma.operator.findUnique({
      where: { id: operatorId },
      select: {
        trustLevel: true,
        trustScore: true,
        trustProfileScore: true,
        trustCatalogScore: true,
        trustOperationsScore: true,
        trustReputationScore: true,
        trustStabilityScore: true,
      },
    });
    if (!operator) return [];

    const targetLevel = Math.min(3, (operator.trustLevel ?? 0) + 1);
    if (targetLevel === operator.trustLevel) return [];

    const requirements: SupplierNextLevelRequirement[] = [];

    if (operator.trustCatalogScore < 20) {
      requirements.push({
        code: 'catalog_quality',
        message: 'Добавьте фото, расписание и подробные описания к активным событиям.',
      });
    }
    if (operator.trustProfileScore < 15) {
      requirements.push({
        code: 'profile_completeness',
        message: 'Заполните профиль компании и контактные данные в разделе настроек.',
      });
    }
    if (operator.trustOperationsScore < 15) {
      requirements.push({
        code: 'operations',
        message: 'Снижайте долю отмен и отклонений на модерации в ближайшие недели.',
      });
    }
    if (operator.trustReputationScore < 10) {
      requirements.push({
        code: 'reputation',
        message: 'Работайте с отзывами: высокий рейтинг и ответы на отзывы улучшают уровень доверия.',
      });
    }
    if (operator.trustStabilityScore < 10) {
      requirements.push({
        code: 'stability',
        message: 'Поддерживайте стабильную работу и продажи в течение нескольких недель.',
      });
    }

    return requirements.slice(0, 4);
  }

  async assertSupplierCanActivateEvent(operatorId: string): Promise<void> {
    const [operator, activeCount] = await Promise.all([
      this.prisma.operator.findUnique({ where: { id: operatorId }, select: { trustLevel: true } }),
      this.getActiveEventsCount(operatorId),
    ]);
    if (!operator) {
      throw new BadRequestException('Operator not found');
    }
    const limit = this.getActiveEventsLimitByTrustLevel(operator.trustLevel ?? 0);
    if (activeCount >= limit) {
      throw new BadRequestException({
        code: 'SUPPLIER_ACTIVE_EVENTS_LIMIT_REACHED',
        message: 'Достигнут лимит активных событий для текущего уровня доверия.',
        details: { activeCount, limit, trustLevel: operator.trustLevel ?? 0 },
      });
    }
  }
}

