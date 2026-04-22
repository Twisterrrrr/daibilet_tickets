import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { PromoBgMode, PromoContentMode, PromoContentType, PromoIconSource, PromoSelectionMode, PromoSortMode } from '@/prisma-client';

const KEBAB_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export class CreatePromoBlockDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(KEBAB_REGEX, { message: 'slug должен быть в формате kebab-case (a-z, 0-9, дефисы)' })
  slug!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiPropertyOptional({ description: 'Для LINK_ONLY обязателен' })
  @IsOptional()
  @IsString()
  href?: string;

  @ApiPropertyOptional({ enum: PromoContentMode })
  @IsOptional()
  @IsEnum(PromoContentMode)
  contentMode?: PromoContentMode;

  @ApiPropertyOptional({ description: 'Для COLLECTION обязателен' })
  @IsOptional()
  @IsString()
  collectionId?: string;

  @ApiPropertyOptional({ enum: PromoSelectionMode })
  @IsOptional()
  @IsEnum(PromoSelectionMode)
  selectionMode?: PromoSelectionMode;

  @ApiPropertyOptional({ enum: PromoContentType })
  @IsOptional()
  @IsEnum(PromoContentType)
  contentType?: PromoContentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  citySlug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categorySlug?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagSlugs?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'targetCitySlugs: пусто — всем; иначе только указанным городам (slug)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetCitySlugs?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  isKids?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  isIndoor?: boolean;

  @ApiPropertyOptional({ enum: PromoSortMode })
  @IsOptional()
  @IsEnum(PromoSortMode)
  autoSort?: PromoSortMode;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  autoLimit?: number;

  @ApiPropertyOptional({ enum: PromoIconSource })
  @IsOptional()
  @IsEnum(PromoIconSource)
  iconSource?: PromoIconSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  iconKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  iconSvg?: string;

  @ApiPropertyOptional({ enum: PromoBgMode })
  @IsOptional()
  @IsEnum(PromoBgMode)
  bgMode?: PromoBgMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bgColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gradientFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gradientTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  endsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;
}

export class UpdatePromoBlockDto extends PartialType(CreatePromoBlockDto) {}
