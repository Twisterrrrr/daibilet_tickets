import {
  IsString, IsOptional, IsBoolean, IsNumber, IsArray,
  IsObject, IsUUID, IsNotEmpty, IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCollectionDto {
  @ApiProperty({ description: 'URL-slug (уникальный)' })
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiProperty({ description: 'Заголовок (H1)' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ description: 'Подзаголовок' })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional({ description: 'ID города (null = кросс-городская)' })
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiPropertyOptional({ description: 'URL hero-изображения' })
  @IsOptional()
  @IsString()
  heroImage?: string;

  @ApiPropertyOptional({ description: 'SEO-описание (markdown)' })
  @IsOptional()
  @IsString()
  description?: string;

  // --- Фильтры ---

  @ApiPropertyOptional({ description: 'Slug тегов (OR-логика)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filterTags?: string[];

  @ApiPropertyOptional({ description: 'EventCategory enum value' })
  @IsOptional()
  @IsString()
  filterCategory?: string;

  @ApiPropertyOptional({ description: 'EventSubcategory enum value' })
  @IsOptional()
  @IsString()
  filterSubcategory?: string;

  @ApiPropertyOptional({ description: 'EventAudience enum value' })
  @IsOptional()
  @IsString()
  filterAudience?: string;

  @ApiPropertyOptional({ description: 'Дополнительные фильтры (JSON)' })
  @IsOptional()
  @IsObject()
  additionalFilters?: Record<string, any>;

  // --- Курация ---

  @ApiPropertyOptional({ description: 'ID закреплённых событий (в порядке отображения)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  pinnedEventIds?: string[];

  @ApiPropertyOptional({ description: 'ID исключённых событий', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  excludedEventIds?: string[];

  // --- SEO ---

  @ApiPropertyOptional({ description: 'SEO title' })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'SEO description' })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  // --- Контент ---

  @ApiPropertyOptional({ description: 'Информационные блоки [{title, text}]' })
  @IsOptional()
  @IsArray()
  infoBlocks?: any[];

  @ApiPropertyOptional({ description: 'FAQ [{question, answer}]' })
  @IsOptional()
  @IsArray()
  faq?: any[];

  // --- Состояние ---

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Порядок сортировки' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class UpdateCollectionDto extends PartialType(CreateCollectionDto) {
  @ApiProperty({ description: 'Optimistic lock version' })
  @Type(() => Number)
  @IsNumber()
  version!: number;
}
