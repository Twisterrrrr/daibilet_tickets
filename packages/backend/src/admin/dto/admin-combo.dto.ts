import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Intensity } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateComboDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiProperty()
  @IsUUID()
  cityId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  heroImage?: string;

  @ApiPropertyOptional({ enum: Intensity })
  @IsOptional()
  @IsEnum(Intensity)
  intensity?: Intensity;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  dayCount!: number;

  @ApiProperty({ description: 'JSON: [{eventId, dayNumber, slot, time}]' })
  @IsArray()
  curatedEvents!: any[];

  @ApiPropertyOptional({ description: 'Ориентировочная цена (копейки)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  suggestedPrice?: number;

  @ApiPropertyOptional({ description: 'JSON: [{icon, title, text}]' })
  @IsOptional()
  @IsArray()
  features?: any[];

  @ApiPropertyOptional({ description: 'JSON: ["Билеты на 3 события", "Гид"]' })
  @IsOptional()
  @IsArray()
  includes?: any[];

  @ApiPropertyOptional({ description: 'JSON: [{question, answer}]' })
  @IsOptional()
  @IsArray()
  faq?: any[];

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

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class UpdateComboDto extends PartialType(CreateComboDto) {
  @ApiPropertyOptional({ description: 'Optimistic lock version' })
  @IsOptional()
  @Type(() => Number)
  version?: number;
}
