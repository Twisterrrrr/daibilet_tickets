import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { TagCategory } from '@prisma/client';

// ── Reconciliation ────────────────────────────────

export class ReconciliationRefundDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  partial?: boolean;
}

export class ReconciliationResolveDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

// ── Admin Orders (Batch 4) ────────────────────────

export class OrderActionDto {
  @ApiPropertyOptional({ description: 'Причина действия (для аудита)' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Idempotency key для ops-действий (Directus Ops)' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class OrderStatusDto {
  @ApiProperty()
  @IsString()
  status!: string;

  @ApiPropertyOptional({ description: 'Причина смены статуса (для аудита)' })
  @IsOptional()
  @IsString()
  reason?: string;
}

// ── External Reviews ──────────────────────────────

export class CreateExternalReviewDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  operatorId?: string;

  @ApiProperty()
  @IsString()
  source!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @ApiProperty()
  @IsString()
  authorName!: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty()
  @IsString()
  text!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  publishedAt?: string;
}

export class BatchExternalReviewsDto {
  @ApiProperty({ type: [CreateExternalReviewDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExternalReviewDto)
  reviews!: CreateExternalReviewDto[];
}

// ── Tags ────────────────────────────────────────────────────────────

export class CreateTagDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: TagCategory })
  @IsEnum(TagCategory)
  category!: TagCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  heroImage?: string;

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
}

export class UpdateTagDto extends PartialType(CreateTagDto) {
  @ApiPropertyOptional()
  @IsOptional()
  version?: number;
}

// ── Cities ──────────────────────────────────────────────────────────

export class UpdateCityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  heroImage?: string;

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
  timezone?: string;

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
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  version?: number;
}

// ── Re-exports from other DTO modules ────────────────────────────────
export * from './admin-event.dto';
export * from './admin-venue.dto';
export * from './admin-landing.dto';
export * from './admin-combo.dto';
export * from './admin-article.dto';
export * from './admin-settings.dto';
export * from './admin-moderation.dto';
export * from './admin-upsell.dto';
export * from './admin-widget.dto';
export * from './admin-support.dto';
export * from './admin-supplier.dto';
export * from './admin-collection.dto';
export * from './admin-checkout.dto';
