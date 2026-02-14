import { IsOptional, IsEnum, IsString, IsISO8601 } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CheckoutStatus } from '@prisma/client';

// ─── Update Session Status (PATCH sessions/:id) ───────────────────

export class UpdateSessionStatusDto {
  @ApiPropertyOptional({ enum: CheckoutStatus })
  @IsOptional()
  @IsEnum(CheckoutStatus)
  status?: CheckoutStatus;
}

// ─── Admin Note (POST confirm / reject) ───────────────────────────

export class AdminNoteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminNote?: string;
}

// ─── CSV Export Query Parameters ─────────────────────────────────

export class ExportRequestsCsvDto {
  @ApiPropertyOptional({ description: 'Статус заявок для фильтрации' })
  @IsOptional()
  @IsEnum(CheckoutStatus)
  status?: string;

  @ApiPropertyOptional({ description: 'Дата начала периода (ISO 8601)', example: '2024-01-01T00:00:00Z' })
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Дата окончания периода (ISO 8601)', example: '2024-01-31T23:59:59Z' })
  @IsOptional()
  @IsISO8601()
  dateTo?: string;
}

export class ExportSessionsCsvDto {
  @ApiPropertyOptional({ description: 'Статус сессий для фильтрации' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Дата начала периода (ISO 8601)', example: '2024-01-01T00:00:00Z' })
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Дата окончания периода (ISO 8601)', example: '2024-01-31T23:59:59Z' })
  @IsOptional()
  @IsISO8601()
  dateTo?: string;
}
