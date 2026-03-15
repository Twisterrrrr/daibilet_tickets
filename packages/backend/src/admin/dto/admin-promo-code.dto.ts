import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { PromoType } from '@prisma/client';

export class CreatePromoCodeDto {
  @ApiProperty({ description: 'Код промо, показываемый пользователю' })
  @IsString()
  @MaxLength(64)
  code!: string;

  @ApiProperty({ enum: PromoType })
  @IsEnum(PromoType)
  type!: PromoType;

  @ApiProperty({
    description: 'Значение скидки: % для PERCENT (0-100), копейки для FIXED',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  value!: number;

  @ApiPropertyOptional({ description: 'Scope по оператору' })
  @IsOptional()
  @IsUUID()
  operatorId?: string;

  @ApiPropertyOptional({ description: 'Scope по событию' })
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @ApiPropertyOptional({ description: 'Дата начала действия (ISO)' })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'Дата окончания действия (ISO)' })
  @IsOptional()
  @IsDateString()
  validTo?: string;

  @ApiPropertyOptional({ description: 'Максимальное количество использований' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxUses?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePromoCodeDto extends PartialType(CreatePromoCodeDto) {}

