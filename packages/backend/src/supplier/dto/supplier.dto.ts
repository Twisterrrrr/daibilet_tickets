import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { OmitType, PartialType } from '@nestjs/swagger';
import { EventAudience, EventCategory, OfferStatus, PurchaseType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

// ============================
// Settings
// ============================

export class UpdateSupplierSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  inn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactPhone?: string;
}

// ============================
// Events
// ============================

export class CreateSupplierEventDto {
  @ApiProperty({ description: 'Название события' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'UUID города' })
  @IsUUID()
  cityId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiPropertyOptional({ enum: EventCategory })
  @IsOptional()
  @IsEnum(EventCategory)
  category?: EventCategory;

  @ApiPropertyOptional({ enum: EventAudience })
  @IsOptional()
  @IsEnum(EventAudience)
  audience?: EventAudience;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

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
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceFrom?: number;
}

export class UpdateSupplierEventDto extends PartialType(OmitType(CreateSupplierEventDto, ['cityId'] as const)) {}

// ============================
// Offers
// ============================

export class CreateSupplierOfferDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ enum: PurchaseType })
  @IsOptional()
  @IsEnum(PurchaseType)
  purchaseType?: PurchaseType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deeplink?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceFrom?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  badge?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  commission?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  widgetProvider?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  widgetPayload?: Record<string, unknown>;
}

export class UpdateSupplierOfferDto {
  @ApiPropertyOptional({ enum: PurchaseType })
  @IsOptional()
  @IsEnum(PurchaseType)
  purchaseType?: PurchaseType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deeplink?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceFrom?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  badge?: string;

  @ApiPropertyOptional({ enum: OfferStatus })
  @IsOptional()
  @IsEnum(OfferStatus)
  status?: OfferStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  widgetProvider?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  widgetPayload?: Record<string, unknown>;
}
