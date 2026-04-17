import { BadRequestException, Controller, Get, Header, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PromoPageScopeType, PromoPlacementZone } from '@/prisma-client';
import { PromoPlacementBlocksPublicService } from './promo-placement-blocks.service';

@ApiTags('public')
@Controller('promo-placement-blocks')
export class PromoPlacementBlocksPublicController {
  constructor(private readonly service: PromoPlacementBlocksPublicService) {}

  @Get('resolved')
  @ApiOperation({ summary: 'Resolved promo placement blocks for a surface/context' })
  @Header('Cache-Control', 'public, max-age=60')
  async resolve(
    @Query('placementZone') placementZone: string,
    @Query('pageScopeType') pageScopeType: string,
    @Query('cityId') cityId?: string,
    @Query('landingId') landingId?: string,
    @Query('collectionId') collectionId?: string,
    @Query('articleId') articleId?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const z = String(placementZone ?? '').trim().toUpperCase();
    const s = String(pageScopeType ?? '').trim().toUpperCase();
    if (!(Object.values(PromoPlacementZone) as string[]).includes(z)) {
      throw new BadRequestException('placementZone is invalid');
    }
    if (!(Object.values(PromoPageScopeType) as string[]).includes(s)) {
      throw new BadRequestException('pageScopeType is invalid');
    }
    const limit = limitRaw ? Number(limitRaw) : undefined;
    return this.service.resolve({
      placementZone: z as PromoPlacementZone,
      pageScopeType: s as PromoPageScopeType,
      cityId: cityId?.trim() || undefined,
      landingId: landingId?.trim() || undefined,
      collectionId: collectionId?.trim() || undefined,
      articleId: articleId?.trim() || undefined,
      limit: Number.isFinite(limit as number) ? (limit as number) : undefined,
    });
  }
}

