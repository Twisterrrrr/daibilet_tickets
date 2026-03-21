import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Блок «Витрина площадки» для VenueAdminSummaryDto */
export class VenueAdminStorefrontDto {
  @ApiProperty({ description: 'События с venueId, isDeleted=false, isActive=true' })
  @IsInt()
  activeEventsCount!: number;

  @ApiProperty({ description: 'Из них: есть хотя бы один будущий активный сеанс' })
  @IsInt()
  eventsWithFutureSlotsCount!: number;

  @ApiPropertyOptional({ description: 'Средний рейтинг по событиям (null если нет)' })
  @IsOptional()
  @IsNumber()
  avgEventRating!: number | null;

  @ApiPropertyOptional({ description: 'Доля готовых к витрине (0..1)' })
  @IsOptional()
  @IsNumber()
  readyRatio!: number | null;

  @ApiProperty({
    enum: ['FULL', 'PARTIAL', 'FROM_OVERRIDE_ONLY'],
    description: 'Как считалось readyRatio',
  })
  @IsEnum(['FULL', 'PARTIAL', 'FROM_OVERRIDE_ONLY'] as const)
  readyDataQuality!: 'FULL' | 'PARTIAL' | 'FROM_OVERRIDE_ONLY';

  @ApiProperty({ description: 'Избранная площадка на подборках' })
  @IsBoolean()
  isFeatured!: boolean;
}

/** Блок «Контент» для VenueAdminSummaryDto */
export class VenueAdminContentDto {
  @ApiProperty()
  @IsBoolean()
  hasVenueTemplateData!: boolean;

  @ApiPropertyOptional({ description: 'Ключи секций, если есть registry' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sectionKeys?: string[];
}

/** Строка таблицы «События площадки» */
export class VenueRelatedEventDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  slug!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category!: string | null;

  @ApiProperty({
    enum: ['READY', 'NEEDS_WORK', 'BLOCKED', 'UNKNOWN'],
    description: 'Агрегат с backend',
  })
  @IsEnum(['READY', 'NEEDS_WORK', 'BLOCKED', 'UNKNOWN'] as const)
  readinessStatus!: 'READY' | 'NEEDS_WORK' | 'BLOCKED' | 'UNKNOWN';

  @ApiProperty({
    enum: ['VISIBLE', 'HIDDEN', 'SUPPRESSED'],
  })
  @IsEnum(['VISIBLE', 'HIDDEN', 'SUPPRESSED'] as const)
  storefrontVisibility!: 'VISIBLE' | 'HIDDEN' | 'SUPPRESSED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  rating!: number | null;

  @ApiProperty()
  @IsInt()
  reviewCount!: number;

  @ApiProperty({ description: 'Путь в админке, например /events/:id' })
  @IsString()
  adminUrlPath!: string;

  @ApiProperty({ description: 'Путь на сайте, например /events/:slug' })
  @IsString()
  publicUrlPath!: string;
}

/** Единый read-model для админки площадки (GET /admin/venues/:id/summary) */
export class VenueAdminSummaryDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty({ type: VenueAdminStorefrontDto })
  @ValidateNested()
  @Type(() => VenueAdminStorefrontDto)
  storefront!: VenueAdminStorefrontDto;

  @ApiProperty({ type: VenueAdminContentDto })
  @ValidateNested()
  @Type(() => VenueAdminContentDto)
  content!: VenueAdminContentDto;

  @ApiProperty({ type: [VenueRelatedEventDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VenueRelatedEventDto)
  relatedEvents!: VenueRelatedEventDto[];

  @ApiPropertyOptional({
    description: 'true если relatedEvents обрезан (лимит N событий)',
  })
  @IsOptional()
  @IsBoolean()
  truncated?: boolean;
}
