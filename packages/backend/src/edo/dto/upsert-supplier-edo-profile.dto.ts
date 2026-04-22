import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EdoProviderType } from '@/prisma-client';
import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

const ALLOWED_PROVIDERS: EdoProviderType[] = ['NOOP', 'DIADOK'];

export class UpsertSupplierEdoProfileDto {
  @ApiProperty({ enum: ALLOWED_PROVIDERS, description: 'Провайдер ЭДО' })
  @IsEnum(ALLOWED_PROVIDERS)
  provider!: EdoProviderType;

  @ApiPropertyOptional({ description: 'ID ящика в ЭДО (обязателен для DIADOK при isActive=true)' })
  @IsOptional()
  @IsString()
  boxId?: string | null;

  @ApiProperty({ description: 'ИНН поставщика' })
  @IsString()
  @MinLength(10, { message: 'ИНН должен содержать минимум 10 символов' })
  inn!: string;

  @ApiPropertyOptional({ description: 'КПП (опционально)' })
  @IsOptional()
  @IsString()
  kpp?: string | null;

  @ApiProperty({ description: 'Профиль активен' })
  @IsBoolean()
  isActive!: boolean;

  @ApiPropertyOptional({ description: 'Доп. настройки провайдера (JSON)' })
  @IsOptional()
  @IsObject()
  settingsJson?: Record<string, unknown> | null;
}
