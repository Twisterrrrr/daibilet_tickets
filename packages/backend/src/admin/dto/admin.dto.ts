import {
  IsString, IsOptional, IsBoolean, IsNumber, IsArray,
  IsISO8601, Min, Max, ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

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
