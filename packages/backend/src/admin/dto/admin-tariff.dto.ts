import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DayOfWeek,
  TicketCategoryKind,
  TicketPriceStatus,
} from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateTariffCategoryDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TicketCategoryKind)
  kind?: TicketCategoryKind;

  @IsOptional()
  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  allowedDays?: DayOfWeek[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefaultForCard?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateTariffCategoryDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TicketCategoryKind)
  kind?: TicketCategoryKind;

  @IsOptional()
  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  allowedDays?: DayOfWeek[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefaultForCard?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateTicketPriceDto {
  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsInt()
  @Min(0)
  priceCents: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  compareAtPriceCents?: number;

  @IsOptional()
  @IsEnum(TicketPriceStatus)
  status?: TicketPriceStatus;
}

export class UpdateTicketPriceDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  priceCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  compareAtPriceCents?: number;

  @IsOptional()
  @IsEnum(TicketPriceStatus)
  status?: TicketPriceStatus;
}

export class CreateTicketQuotaDefaultDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacityTotal?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTicketQuotaDefaultDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  capacityTotal?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateTicketQuotaOverrideDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacityTotal?: number;
}

export class UpdateTicketQuotaOverrideDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  capacityTotal?: number;
}
