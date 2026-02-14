import {
  Controller, Get, Post, Patch, Delete,
  Param, Query, Body, UseGuards, UseInterceptors,
  NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';
import { CreateVenueDto, UpdateVenueDto } from './dto/admin-venue.dto';
import { parsePagination, paginationArgs } from '../common/pagination';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/venues')
export class AdminVenuesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async list(
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('city') city?: string,
    @Query('venueType') venueType?: string,
    @Query('search') search?: string,
  ) {
    const pg = parsePagination({ cursor, page, limit: limit || '20' });

    const where: any = {
      isDeleted: false,
      ...(city && { city: { slug: city } }),
      ...(venueType && { venueType }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { shortTitle: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.venue.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        ...paginationArgs(pg),
        include: {
          city: { select: { name: true, slug: true } },
          _count: { select: { events: true, offers: true } },
        },
      }),
      this.prisma.venue.count({ where }),
    ]);

    const hasMore = items.length > pg.limit;
    const pageItems = hasMore ? items.slice(0, pg.limit) : items;
    const nextCursor = hasMore && pageItems.length > 0 ? pageItems[pageItems.length - 1].id : null;

    return {
      items: pageItems.map((v) => ({
        id: v.id,
        slug: v.slug,
        title: v.title,
        venueType: v.venueType,
        city: v.city,
        rating: Number(v.rating),
        isActive: v.isActive,
        isFeatured: v.isFeatured,
        eventsCount: v._count.events,
        offersCount: v._count.offers,
        updatedAt: v.updatedAt,
      })),
      total,
      nextCursor,
      hasMore,
    };
  }

  @Get(':id')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async get(@Param('id') id: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: {
        city: { select: { id: true, name: true, slug: true } },
        operator: { select: { id: true, name: true, slug: true } },
        events: {
          where: { isActive: true },
          orderBy: [{ isPermanent: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true, slug: true, title: true, dateMode: true,
            isPermanent: true, endDate: true, priceFrom: true, imageUrl: true,
          },
        },
        offers: {
          where: { status: 'ACTIVE' },
          orderBy: { priority: 'desc' },
          select: {
            id: true, source: true, purchaseType: true, priceFrom: true,
            deeplink: true, badge: true, status: true,
          },
        },
      },
    });
    if (!venue) throw new NotFoundException('Venue not found');
    return { ...venue, rating: Number(venue.rating), externalRating: venue.externalRating ? Number(venue.externalRating) : null };
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  async create(@Body() body: CreateVenueDto) {
    if (!body.title || !body.cityId || !body.venueType) {
      throw new BadRequestException('title, cityId, venueType required');
    }

    // Auto-generate slug
    const slug = body.slug || this.generateSlug(body.title);

    const existing = await this.prisma.venue.findUnique({ where: { slug } });
    if (existing) throw new ConflictException(`Slug "${slug}" already exists`);

    // Validate minimum fields for publish
    const wantsActive = body.isActive ?? true;
    if (wantsActive) {
      this.validateForPublish(body);
    }

    const venue = await this.prisma.venue.create({
      data: {
        slug,
        title: body.title,
        shortTitle: body.shortTitle || null,
        venueType: body.venueType,
        cityId: body.cityId,
        description: body.description || null,
        shortDescription: body.shortDescription || null,
        imageUrl: body.imageUrl || null,
        galleryUrls: body.galleryUrls || [],
        address: body.address || null,
        lat: body.lat ? Number(body.lat) : null,
        lng: body.lng ? Number(body.lng) : null,
        metro: body.metro || null,
        district: body.district || null,
        phone: body.phone || null,
        email: body.email || null,
        website: body.website || null,
        openingHours: (body.openingHours || undefined) as any,
        priceFrom: body.priceFrom ? Number(body.priceFrom) : null,
        operatorId: body.operatorId || null,
        isActive: wantsActive,
        isFeatured: body.isFeatured ?? false,
        metaTitle: body.metaTitle || null,
        metaDescription: body.metaDescription || null,
        externalRating: body.externalRating ? Number(body.externalRating) : null,
        externalSource: body.externalSource || null,
        highlights: (body.highlights ?? undefined) as any,
        faq: (body.faq ?? undefined) as any,
        features: body.features || [],
        commissionRate: body.commissionRate ? Number(body.commissionRate) : null,
      },
    });

    return venue;
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  async update(@Param('id') id: string, @Body() body: UpdateVenueDto) {
    // Optimistic lock
    const version = body.version;
    if (version === undefined) throw new BadRequestException('version required for update');

    // If activating, validate minimum fields (merge existing data + body)
    if (body.isActive === true) {
      const existing = await this.prisma.venue.findUnique({ where: { id } });
      if (existing) {
        const merged = {
          title: body.title ?? existing.title,
          address: body.address ?? existing.address,
          imageUrl: body.imageUrl ?? existing.imageUrl,
          priceFrom: body.priceFrom ?? existing.priceFrom,
          galleryUrls: body.galleryUrls ?? existing.galleryUrls,
          description: body.description ?? existing.description,
        };
        this.validateForPublish(merged);
      }
    }

    const result = await this.prisma.venue.updateMany({
      where: { id, version: Number(version) },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.shortTitle !== undefined && { shortTitle: body.shortTitle || null }),
        ...(body.venueType !== undefined && { venueType: body.venueType }),
        ...(body.description !== undefined && { description: body.description || null }),
        ...(body.shortDescription !== undefined && { shortDescription: body.shortDescription || null }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl || null }),
        ...(body.galleryUrls !== undefined && { galleryUrls: body.galleryUrls }),
        ...(body.address !== undefined && { address: body.address || null }),
        ...(body.lat !== undefined && { lat: body.lat ? Number(body.lat) : null }),
        ...(body.lng !== undefined && { lng: body.lng ? Number(body.lng) : null }),
        ...(body.metro !== undefined && { metro: body.metro || null }),
        ...(body.district !== undefined && { district: body.district || null }),
        ...(body.phone !== undefined && { phone: body.phone || null }),
        ...(body.email !== undefined && { email: body.email || null }),
        ...(body.website !== undefined && { website: body.website || null }),
        ...(body.openingHours !== undefined && { openingHours: body.openingHours }),
        ...(body.priceFrom !== undefined && { priceFrom: body.priceFrom ? Number(body.priceFrom) : null }),
        ...(body.operatorId !== undefined && { operatorId: body.operatorId || null }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.isFeatured !== undefined && { isFeatured: body.isFeatured }),
        ...(body.metaTitle !== undefined && { metaTitle: body.metaTitle || null }),
        ...(body.metaDescription !== undefined && { metaDescription: body.metaDescription || null }),
        ...(body.externalRating !== undefined && { externalRating: body.externalRating ? Number(body.externalRating) : null }),
        ...(body.externalSource !== undefined && { externalSource: body.externalSource || null }),
        // Conversion fields
        ...(body.highlights !== undefined && { highlights: body.highlights }),
        ...(body.faq !== undefined && { faq: body.faq }),
        ...(body.features !== undefined && { features: body.features }),
        ...(body.commissionRate !== undefined && { commissionRate: body.commissionRate ? Number(body.commissionRate) : null }),
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      throw new ConflictException('Данные были изменены другим пользователем. Обновите страницу.');
    }

    return this.prisma.venue.findUnique({ where: { id } });
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    const venue = await this.prisma.venue.findUnique({ where: { id } });
    if (!venue) throw new NotFoundException('Venue not found');

    await this.prisma.venue.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), isActive: false },
    });

    return { success: true };
  }

  /**
   * Validate minimum required fields for venue publication.
   * Rule: venue cannot be active without these fields filled.
   * Required: title, address, imageUrl, priceFrom, description (at least short).
   */
  private validateForPublish(data: any): void {
    const errors: string[] = [];

    if (!data.title?.trim()) errors.push('Название (title)');
    if (!data.address?.trim()) errors.push('Адрес (address)');
    if (!data.imageUrl?.trim()) errors.push('Основное фото (imageUrl)');
    if (!data.priceFrom || Number(data.priceFrom) <= 0) errors.push('Цена от (priceFrom)');
    if (!data.description?.trim() && !data.shortDescription?.trim()) errors.push('Описание (description)');

    // Рекомендация: минимум 3 фото (image + 2 gallery), но не блокируем
    const galleryCount = (data.galleryUrls || []).length;
    const totalPhotos = (data.imageUrl ? 1 : 0) + galleryCount;
    if (totalPhotos < 3) {
      // Soft warning — не блокируем, но логируем
      // В будущем можно сделать строгим
    }

    if (errors.length > 0) {
      throw new BadRequestException(
        `Для публикации заполните обязательные поля: ${errors.join(', ')}`,
      );
    }
  }

  private generateSlug(title: string): string {
    const translitMap: Record<string, string> = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
      'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm',
      'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
      'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
      'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    };
    return title
      .toLowerCase()
      .split('')
      .map((c) => translitMap[c] ?? c)
      .join('')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 80);
  }
}
