import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

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
  howToChoose?: any[];

  @ApiPropertyOptional({ description: 'JSON: [{title, text}]' })
  @IsOptional()
  @IsArray()
  infoBlocks?: any[];

  @ApiPropertyOptional({ description: 'JSON: [{question, answer}]' })
  @IsOptional()
  @IsArray()
  faq?: any[];

  @ApiPropertyOptional({ description: 'JSON: [{text, author, rating}]' })
  @IsOptional()
  @IsArray()
  reviews?: any[];

  @ApiPropertyOptional({ description: 'JSON: {soldTickets, avgRating}' })
  @IsOptional()
  @IsObject()
  stats?: Record<string, any>;

  @ApiPropertyOptional({ description: 'JSON: [{title, href}]' })
  @IsOptional()
  @IsArray()
  relatedLinks?: any[];

  @ApiPropertyOptional({ description: 'JSON: {category?, source?, ...}' })
  @IsOptional()
  @IsObject()
  additionalFilters?: Record<string, any>;

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
