import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LandingBlockType } from '@/prisma-client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateLandingContentBlockDto {
  @ApiProperty({ enum: LandingBlockType })
  @IsEnum(LandingBlockType)
  type!: LandingBlockType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  variant?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  subtitle?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  eyebrow?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body?: string | null;

  @ApiPropertyOptional({ description: 'Структурированный rich text (TipTap и др.)' })
  @IsOptional()
  @IsObject()
  richTextJson?: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'Произвольный payload блока' })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  assetUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  mobileAssetUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  visibilityRules?: Record<string, unknown> | null;
}

export class UpdateLandingContentBlockDto {
  @ApiPropertyOptional({ enum: LandingBlockType })
  @IsOptional()
  @IsEnum(LandingBlockType)
  type?: LandingBlockType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  variant?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  subtitle?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  eyebrow?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  richTextJson?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  assetUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  mobileAssetUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  visibilityRules?: Record<string, unknown> | null;
}

export class ReorderLandingContentBlocksDto {
  @ApiProperty({ type: [String], description: 'Полный порядок id блоков лендинга' })
  @IsArray()
  @IsUUID('4', { each: true })
  orderedIds!: string[];
}
