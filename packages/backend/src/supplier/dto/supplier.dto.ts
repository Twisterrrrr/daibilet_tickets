import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { OmitType, PartialType } from '@nestjs/swagger';
import { EventAudience, EventCategory, OfferStatus, PurchaseType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsEnum, IsInt, IsNumber, IsObject, IsOptional, IsString, IsUUID, Matches, MaxLength, Min } from 'class-validator';

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
// Legal profile & bank accounts (P3-4)
// ============================

export class UpdateSupplierLegalProfileDto {
  @ApiPropertyOptional({ description: 'Юридическое наименование организации' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  legalName?: string;

  @ApiPropertyOptional({ description: 'Юридический адрес' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  legalAddress?: string;

  @ApiPropertyOptional({ description: 'ИНН организации (10 или 12 цифр)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{10}(\d{2})?$/, { message: 'ИНН должен содержать 10 или 12 цифр' })
  inn?: string;

  @ApiPropertyOptional({ description: 'КПП (9 цифр)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{9}$/, { message: 'КПП должен содержать 9 цифр' })
  kpp?: string;

  @ApiPropertyOptional({ description: 'ОГРН (13 или 15 цифр)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{13}(\d{2})?$/, { message: 'ОГРН должен содержать 13 или 15 цифр' })
  ogrn?: string;

  @ApiPropertyOptional({ description: 'Email для финансовых уведомлений' })
  @IsOptional()
  @IsEmail()
  financeEmail?: string;

  @ApiPropertyOptional({ description: 'Email для документов' })
  @IsOptional()
  @IsEmail()
  docsEmail?: string;
}

export class CreateSupplierBankAccountDto {
  @ApiPropertyOptional({ description: 'Наименование банка' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  bankName?: string;

  @ApiProperty({ description: 'БИК (9 цифр)' })
  @IsString()
  @Matches(/^\d{9}$/, { message: 'БИК должен содержать 9 цифр' })
  bik!: string;

  @ApiProperty({ description: 'Расчётный счёт (20 цифр)' })
  @IsString()
  @Matches(/^\d{20}$/, { message: 'Расчётный счёт должен содержать 20 цифр' })
  accountNumber!: string;

  @ApiPropertyOptional({ description: 'Корреспондентский счёт (20 цифр)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{20}$/, { message: 'Корреспондентский счёт должен содержать 20 цифр' })
  correspondentAccount?: string;

  @ApiPropertyOptional({ description: 'Сделать счёт основным' })
  @IsOptional()
  @Type(() => Boolean)
  isPrimary?: boolean;
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
