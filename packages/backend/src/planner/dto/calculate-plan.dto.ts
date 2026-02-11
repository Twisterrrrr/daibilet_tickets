import { IsString, IsInt, Min, IsEnum, IsArray, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Intensity } from '@prisma/client';

export class CalculatePlanDto {
  @ApiProperty({ description: 'Slug города', example: 'saint-petersburg' })
  @IsString()
  city!: string;

  @ApiProperty({ description: 'Дата начала (ISO)', example: '2026-06-15' })
  @IsDateString()
  dateFrom!: string;

  @ApiProperty({ description: 'Дата окончания (ISO)', example: '2026-06-17' })
  @IsDateString()
  dateTo!: string;

  @ApiProperty({ description: 'Количество взрослых', example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  adults!: number;

  @ApiPropertyOptional({ description: 'Количество детей', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  children?: number = 0;

  @ApiPropertyOptional({ description: 'Возрасты детей', example: [8, 12] })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  childrenAges?: number[];

  @ApiProperty({ description: 'Насыщенность', enum: Intensity, example: 'NORMAL' })
  @IsEnum(Intensity)
  intensity!: Intensity;
}
