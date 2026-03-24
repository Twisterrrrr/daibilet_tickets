import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaymentMode, PspFeeMode, SupplierRole } from '@prisma/client';

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

  /** @deprecated Игнорируется: при сохранении promo обнуляется, используйте только commissionRate. */
  @ApiPropertyOptional({ description: 'Устарело: не используется', deprecated: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  promoRate?: number;

  /** @deprecated Игнорируется. */
  @ApiPropertyOptional({ description: 'Устарело: не используется', deprecated: true })
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

  @ApiPropertyOptional({ description: 'Дефолтный текст правил возврата/обмена для Venue/Event' })
  @IsOptional()
  @IsString()
  defaultRefundPolicyText?: string;
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

export class UpdateSupplierUserRoleDto {
  @ApiProperty({ enum: SupplierRole })
  @IsEnum(SupplierRole)
  role!: SupplierRole;
}

export class UpdateOperatorPaymentSettingsDto {
  @ApiPropertyOptional({ enum: PaymentMode })
  @IsOptional()
  @IsEnum(PaymentMode)
  paymentMode?: PaymentMode;

  @ApiPropertyOptional({ description: 'Включить агентскую схему (agent_sign) для чеков' })
  @IsOptional()
  @IsBoolean()
  agentSchemeEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Разрешить split-платежи (будущее использование)' })
  @IsOptional()
  @IsBoolean()
  splitEnabled?: boolean;

  @ApiPropertyOptional({ enum: PspFeeMode })
  @IsOptional()
  @IsEnum(PspFeeMode)
  pspFeeMode?: PspFeeMode;
}

export class SetTrustOverrideDto {
  @ApiProperty({ description: 'Сдвиг к trustScore (−100…+100)', minimum: -100, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(-100)
  @Max(100)
  scoreDelta!: number;

  @ApiProperty({ description: 'Причина override' })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  reason!: string;

  @ApiProperty({ description: 'Окончание действия (ISO 8601)' })
  @IsDateString()
  expiresAt!: string;
}
