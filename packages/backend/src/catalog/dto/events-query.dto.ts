import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EventCategory, EventAudience } from '@prisma/client';

export class EventsQueryDto {
  @ApiPropertyOptional({ description: 'Slug города' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ enum: EventCategory })
  @IsOptional()
  @IsEnum(EventCategory)
  category?: EventCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subcategory?: string;

  @ApiPropertyOptional({ enum: EventAudience })
  @IsOptional()
  @IsEnum(EventAudience)
  audience?: EventAudience;

  @ApiPropertyOptional({ description: 'Slug тега' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: 'Дата от (ISO)' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Дата до (ISO)' })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Сортировка: popular, price_asc, price_desc, rating' })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({ description: 'Время суток: morning, day, evening, night' })
  @IsOptional()
  @IsString()
  timeOfDay?: string;

  @ApiPropertyOptional({ description: 'UUID или slug причала (startLocationId)' })
  @IsOptional()
  @IsString()
  pier?: string;

  @ApiPropertyOptional({ description: 'Макс. длительность в минутах' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxDuration?: number;

  @ApiPropertyOptional({ description: 'Мин. длительность в минутах' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  minDuration?: number;

  @ApiPropertyOptional({ description: 'Макс. минимальный возраст (minAge <= X)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxMinAge?: number;

  @ApiPropertyOptional({ description: 'Режим даты: SCHEDULED | OPEN_DATE' })
  @IsOptional()
  @IsString()
  dateMode?: string;

  @ApiPropertyOptional({ description: 'UUID venue для фильтрации по месту' })
  @IsOptional()
  @IsString()
  venueId?: string;

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
  limit?: number = 20;
}
