import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventCategory } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpsertSourceCategoryMappingDto {
  @ApiProperty({ description: 'Источник (например, TC, TEPLOHOD, RADARIO)' })
  @IsString()
  @IsNotEmpty()
  source!: string;

  @ApiProperty({ description: 'Сырая категория из внешней системы' })
  @IsString()
  @IsNotEmpty()
  externalCategory!: string;

  @ApiProperty({ enum: EventCategory, description: 'Внутренняя категория EventCategory' })
  @IsEnum(EventCategory)
  internalCategory!: EventCategory;
}

export class SourceCategoryMappingDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  source!: string;

  @ApiProperty()
  externalCategoryNorm!: string;

  @ApiProperty({ enum: EventCategory })
  internalCategory!: EventCategory;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class SourceCategoryUnknownDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  source!: string;

  @ApiProperty()
  externalCategoryRaw!: string;

  @ApiProperty()
  externalCategoryNorm!: string;

  @ApiProperty()
  firstSeenAt!: string;

  @ApiProperty()
  lastSeenAt!: string;

  @ApiProperty()
  hits!: number;
}

