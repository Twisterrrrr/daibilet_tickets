import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@/prisma-client';
import { PrismaService } from '../prisma/prisma.service';
import { sanitizeSvg } from '../common/utils/sanitize-svg';
import { normalizePromoPeriod } from '../promo/promo-period.util';
import type { CreatePromoBlockDto, UpdatePromoBlockDto } from './dto/admin-promo-block.dto';

@Injectable()
export class AdminPromoBlocksService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.promoBlock.findMany({
      orderBy: [{ priority: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getById(id: string) {
    return this.prisma.promoBlock.findUniqueOrThrow({
      where: { id },
      include: {
        collection: {
          include: {
            items: { include: { event: true, venue: true }, orderBy: { sortOrder: 'asc' } },
            rule: true,
          },
        },
        events: { include: { event: true }, orderBy: { sortOrder: 'asc' } },
        venues: { include: { venue: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async create(data: CreatePromoBlockDto) {
    const contentMode = data.contentMode ?? 'LINK_ONLY';
    if (contentMode === 'LINK_ONLY' && (!data.href || !String(data.href).trim())) {
      throw new BadRequestException('Для LINK_ONLY href обязателен');
    }
    if (contentMode === 'COLLECTION' && (!data.collectionId || !String(data.collectionId).trim())) {
      throw new BadRequestException('Для COLLECTION collectionId обязателен');
    }
    const slug = data.slug.trim().toLowerCase();
    const existing = await this.prisma.promoBlock.findUnique({ where: { slug } });
    if (existing) {
      throw new BadRequestException(`Promo block с slug "${slug}" уже существует`);
    }

    const payload = this.buildPayload(data) as Prisma.PromoBlockCreateInput;
    return this.prisma.promoBlock.create({ data: payload });
  }

  async update(id: string, data: UpdatePromoBlockDto) {
    const contentMode = data.contentMode ?? (data as { contentMode?: string }).contentMode;
    if (contentMode === 'LINK_ONLY' && data.href !== undefined && !String(data.href).trim()) {
      throw new BadRequestException('Для LINK_ONLY href не может быть пустым');
    }
    if (contentMode === 'COLLECTION' && data.collectionId !== undefined && !String(data.collectionId).trim()) {
      throw new BadRequestException('Для COLLECTION collectionId обязателен');
    }
    const block = await this.prisma.promoBlock.findUniqueOrThrow({ where: { id } });
    if (data.slug !== undefined) {
      const slug = (data.slug as string).trim().toLowerCase();
      if (slug !== block.slug) {
        const existing = await this.prisma.promoBlock.findUnique({ where: { slug } });
        if (existing) {
          throw new BadRequestException(`Promo block с slug "${slug}" уже существует`);
        }
      }
    }

    const payload = this.buildPayload(data) as Prisma.PromoBlockUpdateInput;
    return this.prisma.promoBlock.update({ where: { id }, data: payload });
  }

  async remove(id: string) {
    await this.prisma.promoBlock.delete({ where: { id } });
    return { success: true };
  }

  private buildPayload(
    data: CreatePromoBlockDto | UpdatePromoBlockDto,
  ): Record<string, unknown> {
    const p: Record<string, unknown> = {};

    if (data.slug !== undefined) p.slug = (data.slug as string).trim().toLowerCase();
    if (data.title !== undefined) p.title = data.title;
    if (data.description !== undefined) p.description = data.description;
    if (data.href !== undefined) p.href = (data.href as string)?.trim() || null;
    if (data.contentMode !== undefined) p.contentMode = data.contentMode;
    if (data.collectionId !== undefined) p.collectionId = (data.collectionId as string)?.trim() || null;
    if (data.selectionMode !== undefined) p.selectionMode = data.selectionMode;
    if (data.contentType !== undefined) p.contentType = data.contentType;
    if (data.citySlug !== undefined) p.citySlug = data.citySlug || null;
    if (data.categorySlug !== undefined) p.categorySlug = data.categorySlug || null;
    if (data.tagSlugs !== undefined) p.tagSlugs = data.tagSlugs ?? [];
    if (data.targetCitySlugs !== undefined) {
      const arr = Array.isArray(data.targetCitySlugs) ? data.targetCitySlugs : [];
      p.targetCitySlugs = arr.map((s) => String(s).trim().toLowerCase()).filter(Boolean);
    }
    if (data.isKids !== undefined) p.isKids = data.isKids;
    if (data.isIndoor !== undefined) p.isIndoor = data.isIndoor;
    if (data.autoSort !== undefined) p.autoSort = data.autoSort;
    if (data.autoLimit !== undefined) p.autoLimit = data.autoLimit;

    if (data.iconSource !== undefined) p.iconSource = data.iconSource;
    if (data.iconKey !== undefined) p.iconKey = data.iconKey || null;
    if (data.iconSvg !== undefined) {
      p.iconSvg = data.iconSvg ? sanitizeSvg(data.iconSvg) : null;
    }

    if (data.bgMode !== undefined) p.bgMode = data.bgMode;
    if (data.bgColor !== undefined) p.bgColor = data.bgColor || null;
    if (data.gradientFrom !== undefined) p.gradientFrom = data.gradientFrom || null;
    if (data.gradientTo !== undefined) p.gradientTo = data.gradientTo || null;

    if (data.startsAt !== undefined || data.endsAt !== undefined) {
      const { startsAt, endsAt } = normalizePromoPeriod(
        data.startsAt as string | undefined,
        data.endsAt as string | undefined,
      );
      if (data.startsAt !== undefined) p.startsAt = startsAt;
      if (data.endsAt !== undefined) p.endsAt = endsAt;
    }

    if (data.priority !== undefined) p.priority = data.priority;
    if (data.sortOrder !== undefined) p.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) p.isActive = data.isActive;

    return p;
  }
}
