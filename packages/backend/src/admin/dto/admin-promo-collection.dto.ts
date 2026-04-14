import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import {
  PromoCollectionContentType,
  PromoCollectionItemType,
  PromoSelectionMode,
  PromoSortMode,
} from '@/prisma-client';

const KEBAB_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export class CreatePromoCollectionDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  @Matches(KEBAB_REGEX, { message: 'slug должен быть в формате kebab-case (a-z, 0-9, дефисы)' })
  slug!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: PromoSelectionMode })
  @IsEnum(PromoSelectionMode)
  selectionMode!: PromoSelectionMode;

  @ApiProperty({ enum: PromoCollectionContentType })
  @IsEnum(PromoCollectionContentType)
  contentType!: PromoCollectionContentType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;
}

export class UpdatePromoCollectionDto extends PartialType(CreatePromoCollectionDto) {}

export class CreatePromoCollectionItemDto {
  @ApiProperty({ enum: PromoCollectionItemType })
  @IsEnum(PromoCollectionItemType)
  itemType!: PromoCollectionItemType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  venueId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdatePromoCollectionItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpsertPromoCollectionRuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  citySlug?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categorySlug?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagSlugs?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  isKids?: boolean | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  isIndoor?: boolean | null;

  @ApiPropertyOptional({ enum: PromoSortMode })
  @IsOptional()
  @IsEnum(PromoSortMode)
  sortMode?: PromoSortMode;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  onlyActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  onlyBookable?: boolean;
}
