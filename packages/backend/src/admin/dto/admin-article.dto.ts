import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

export class ArticleLandingLinkInputDto {
  @ApiProperty({ description: 'LandingPage.id' })
  @IsUUID()
  landingId!: string;

  @ApiPropertyOptional({ description: 'Position (0..N)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  position?: number;

  @ApiPropertyOptional({ description: 'Priority (tie-breaker)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  priority?: number;
}

export class ArticleCollectionLinkInputDto {
  @ApiProperty({ description: 'Collection.id' })
  @IsUUID()
  collectionId!: string;

  @ApiPropertyOptional({ description: 'Position (0..N)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  position?: number;

  @ApiPropertyOptional({ description: 'Priority (tie-breaker)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  priority?: number;
}

export class CreateArticleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: 'Markdown content' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  excerpt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverImage?: string;

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
  isPublished?: boolean;

  @ApiPropertyOptional({ description: 'ISO date string' })
  @IsOptional()
  @IsString()
  publishedAt?: string;

  // Legacy fields (без FK) — оставляем ради совместимости
  @ApiPropertyOptional({ description: 'Legacy: LandingPage UUIDs (no FK)' })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  relatedLandingIds?: string[];

  @ApiPropertyOptional({ description: 'Legacy: Collection UUIDs (no FK)' })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  relatedCollectionIds?: string[];

  // New M2M link tables (with positions)
  @ApiPropertyOptional({ type: [ArticleLandingLinkInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArticleLandingLinkInputDto)
  landingLinks?: ArticleLandingLinkInputDto[];

  @ApiPropertyOptional({ type: [ArticleCollectionLinkInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArticleCollectionLinkInputDto)
  collectionLinks?: ArticleCollectionLinkInputDto[];
}

export class UpdateArticleDto extends PartialType(CreateArticleDto) {
  @ApiPropertyOptional({ description: 'Optimistic lock version' })
  @IsOptional()
  version?: number;
}
