import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { LandingEventSourceType, LandingSelectionMode, LandingStatus, LandingTemplateType, LandingType } from '@/prisma-client';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateLandingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiPropertyOptional({ description: 'Город (обязателен только для landingType=CITY)' })
  @IsOptional()
  @IsUUID()
  cityId?: string | null;

  @ApiPropertyOptional({ enum: LandingType })
  @IsOptional()
  @IsEnum(LandingType)
  landingType?: LandingType;

  @ApiPropertyOptional({ description: 'Родительский HUB/MULTI_CITY (только для CITY)' })
  @IsOptional()
  @IsUUID()
  parentLandingId?: string | null;

  @ApiProperty({ description: 'Slug тега для фильтрации событий' })
  @IsString()
  @IsNotEmpty()
  filterTag!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  heroText?: string;

  @ApiPropertyOptional({ description: 'JSON: [{title, text}]' })
  @IsOptional()
  @IsArray()
  howToChoose?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: 'JSON: [{title, text}]' })
  @IsOptional()
  @IsArray()
  infoBlocks?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: 'JSON: [{question, answer}]' })
  @IsOptional()
  @IsArray()
  faq?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: 'JSON: [{text, author, rating}]' })
  @IsOptional()
  @IsArray()
  reviews?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: 'JSON: {soldTickets, avgRating}' })
  @IsOptional()
  @IsObject()
  stats?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'JSON: [{title, href}]' })
  @IsOptional()
  @IsArray()
  relatedLinks?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: 'JSON: {category?, source?, ...}' })
  @IsOptional()
  @IsObject()
  additionalFilters?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Привязка к подборке' })
  @IsOptional()
  @IsUUID()
  collectionId?: string;

  @ApiPropertyOptional({ enum: LandingSelectionMode })
  @IsOptional()
  @IsEnum(LandingSelectionMode)
  selectionMode?: LandingSelectionMode;

  @ApiPropertyOptional({ enum: LandingEventSourceType })
  @IsOptional()
  @IsEnum(LandingEventSourceType)
  eventSourceType?: LandingEventSourceType;

  @ApiPropertyOptional({ description: 'JSON: query config (валидируемый контракт на backend) ' })
  @IsOptional()
  @IsObject()
  queryConfig?: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'JSON: ranking config' })
  @IsOptional()
  @IsObject()
  rankingJson?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'JSON для SEASONAL_EVENT: viewpoints[], tips[] (салют и др.)',
  })
  @IsOptional()
  @IsObject()
  seasonalPayload?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: LandingTemplateType })
  @IsOptional()
  @IsEnum(LandingTemplateType)
  templateType?: LandingTemplateType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legalText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  canonicalUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  relatedArticleIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  relatedCollectionIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: LandingStatus })
  @IsOptional()
  @IsEnum(LandingStatus)
  status?: LandingStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showInCollections?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isIndexable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class UpdateLandingDto extends PartialType(CreateLandingDto) {
  @ApiPropertyOptional({ description: 'Optimistic lock version' })
  @IsOptional()
  @Type(() => Number)
  version?: number;
}
