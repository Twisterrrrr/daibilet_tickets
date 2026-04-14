import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { LandingSelectionMode, LandingStatus, LandingTemplateType } from '@/prisma-client';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateLandingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiProperty()
  @IsUUID()
  cityId!: string;

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
