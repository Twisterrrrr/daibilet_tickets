import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EventCategory, EventSource } from '@prisma/client';

export class CatalogQueryDto {
  @ApiPropertyOptional({ description: 'EXCURSION | EVENT → Event, MUSEUM → Venue' })
  @IsOptional()
  @IsEnum(EventCategory)
  category?: EventCategory;

  @ApiPropertyOptional({ description: 'Slug города' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Slug региона — музеи всех городов региона (hub + members)' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ description: 'Поиск по названию' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: EventSource, description: 'Фильтр по источнику: TC | TEPLOHOD | MANUAL (только для Event)' })
  @IsOptional()
  @IsEnum(EventSource)
  source?: EventSource;

  @ApiPropertyOptional({ description: 'popular | rating | price_asc | price_desc | departing_soon (только event)' })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 20;

  /** Быстрые фильтры для музеев: center | kids | short | modern | free */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  qf?: string;
}
