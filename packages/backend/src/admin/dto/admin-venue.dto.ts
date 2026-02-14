import {
  IsString, IsOptional, IsBoolean, IsNumber, IsArray,
  IsEnum, IsObject, IsUUID, IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { VenueType } from '@prisma/client';

export class CreateVenueDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty()
  @IsUUID()
  cityId!: string;

  @ApiProperty({ enum: VenueType })
  @IsEnum(VenueType)
  venueType!: VenueType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shortTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  galleryUrls?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metro?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ description: 'JSON: {"mon":"10:00-18:00",...}' })
  @IsOptional()
  @IsObject()
  openingHours?: Record<string, string | null>;

  @ApiPropertyOptional({ description: 'Минимальная цена (копейки)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceFrom?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  operatorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

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
  @Type(() => Number)
  @IsNumber()
  externalRating?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalSource?: string;

  @ApiPropertyOptional({ description: 'JSON array of highlight strings' })
  @IsOptional()
  @IsArray()
  highlights?: any[];

  @ApiPropertyOptional({ description: 'JSON array: [{q, a}]' })
  @IsOptional()
  @IsArray()
  faq?: any[];

  @ApiPropertyOptional({ description: 'Feature flags array' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({ description: 'Индивидуальная комиссия (%)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  commissionRate?: number;
}

export class UpdateVenueDto extends PartialType(CreateVenueDto) {
  @ApiProperty({ description: 'Optimistic lock version' })
  @Type(() => Number)
  @IsNumber()
  version!: number;
}
