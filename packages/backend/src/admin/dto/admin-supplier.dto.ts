import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateSupplierDto {
  @ApiPropertyOptional({ description: 'Trust level: 0, 1, 2' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  trustLevel?: number;

  @ApiPropertyOptional({ description: 'Базовая комиссия (0.25 = 25%)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  commissionRate?: number;

  @ApiPropertyOptional({ description: 'Промо-комиссия' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  promoRate?: number;

  @ApiPropertyOptional({ description: 'Окончание промо (ISO date)' })
  @IsOptional()
  @IsString()
  promoUntil?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Sub-merchant ID в YooKassa' })
  @IsOptional()
  @IsString()
  yookassaAccountId?: string;

  @ApiPropertyOptional({ description: 'Set true to mark as verified now' })
  @IsOptional()
  @IsBoolean()
  verifiedAt?: boolean;
}

export class CreateApiKeyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Requests per minute' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  rateLimit?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ipWhitelist?: string[];
}

export class UpdateWebhookDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  webhookUrl?: string;

  @ApiPropertyOptional({ description: 'Regenerate webhook secret' })
  @IsOptional()
  @IsBoolean()
  regenerateSecret?: boolean;
}
