import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import { PromoBlockStatus, PromoPageScopeType, PromoPlacementZone, PromoTargetType } from '@/prisma-client';

export class AdminPromoPlacementBlocksQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: PromoBlockStatus })
  @IsOptional()
  @IsEnum(PromoBlockStatus)
  status?: PromoBlockStatus;

  @ApiPropertyOptional({ enum: PromoPlacementZone })
  @IsOptional()
  @IsEnum(PromoPlacementZone)
  placementZone?: PromoPlacementZone;

  @ApiPropertyOptional({ enum: PromoPageScopeType })
  @IsOptional()
  @IsEnum(PromoPageScopeType)
  pageScopeType?: PromoPageScopeType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  landingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  collectionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  articleId?: string;

  @ApiPropertyOptional({ enum: PromoTargetType })
  @IsOptional()
  @IsEnum(PromoTargetType)
  targetType?: PromoTargetType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({
    enum: ['updatedAt', 'publishedAt', 'priority', 'sortOrder', 'title'] as const,
  })
  @IsOptional()
  @IsEnum(['updatedAt', 'publishedAt', 'priority', 'sortOrder', 'title'] as const)
  sort?: 'updatedAt' | 'publishedAt' | 'priority' | 'sortOrder' | 'title';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] as const })
  @IsOptional()
  @IsEnum(['asc', 'desc'] as const)
  order?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description: 'Computed readiness filter (operator-facing)',
    enum: ['READY', 'EMPTY', 'SCHEDULED', 'EXPIRED', 'INACTIVE', 'MISCONFIGURED'] as const,
  })
  @IsOptional()
  @IsEnum(['READY', 'EMPTY', 'SCHEDULED', 'EXPIRED', 'INACTIVE', 'MISCONFIGURED'] as const)
  readiness?: 'READY' | 'EMPTY' | 'SCHEDULED' | 'EXPIRED' | 'INACTIVE' | 'MISCONFIGURED';

  @ApiPropertyOptional({
    description: 'SEO issues only (diagnostics, not a blocker). Currently applies to EVENT targets.',
    enum: ['0', '1'] as const,
  })
  @IsOptional()
  @IsEnum(['0', '1'] as const)
  seoOnly?: '0' | '1';
}

export class AdminPromoPlacementResolvedPreviewQueryDto {
  @ApiProperty({ enum: PromoPageScopeType })
  @IsEnum(PromoPageScopeType)
  pageScopeType!: PromoPageScopeType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  landingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  collectionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  articleId?: string;

  @ApiPropertyOptional({ description: 'How many resolved items to return (top N)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class CreatePromoPlacementBlockDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty({ enum: PromoPlacementZone })
  @IsEnum(PromoPlacementZone)
  placementZone!: PromoPlacementZone;

  @ApiProperty({ enum: PromoPageScopeType })
  @IsEnum(PromoPageScopeType)
  pageScopeType!: PromoPageScopeType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cityId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  landingId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  collectionId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  articleId?: string | null;

  @ApiProperty({ enum: PromoTargetType })
  @IsEnum(PromoTargetType)
  targetType!: PromoTargetType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  targetEventId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  targetCollectionId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  targetLandingId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  targetArticleId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customSubtitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customImageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ctaLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'ISO 8601' })
  @IsOptional()
  @IsISO8601()
  startsAt?: string | null;

  @ApiPropertyOptional({ description: 'ISO 8601' })
  @IsOptional()
  @IsISO8601()
  endsAt?: string | null;
}

export class UpdatePromoPlacementBlockDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ enum: PromoBlockStatus })
  @IsOptional()
  @IsEnum(PromoBlockStatus)
  status?: PromoBlockStatus;

  @ApiPropertyOptional({ enum: PromoPlacementZone })
  @IsOptional()
  @IsEnum(PromoPlacementZone)
  placementZone?: PromoPlacementZone;

  @ApiPropertyOptional({ enum: PromoPageScopeType })
  @IsOptional()
  @IsEnum(PromoPageScopeType)
  pageScopeType?: PromoPageScopeType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cityId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  landingId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  collectionId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  articleId?: string | null;

  @ApiPropertyOptional({ enum: PromoTargetType })
  @IsOptional()
  @IsEnum(PromoTargetType)
  targetType?: PromoTargetType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  targetEventId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  targetCollectionId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  targetLandingId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  targetArticleId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customTitle?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customSubtitle?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customImageUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ctaLabel?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'ISO 8601' })
  @IsOptional()
  @IsISO8601()
  startsAt?: string | null;

  @ApiPropertyOptional({ description: 'ISO 8601' })
  @IsOptional()
  @IsISO8601()
  endsAt?: string | null;
}

