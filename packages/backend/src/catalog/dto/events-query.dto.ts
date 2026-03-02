import { ApiPropertyOptional } from '@nestjs/swagger';
import { EventAudience, EventCategory, EventSource } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min, IsIn } from 'class-validator';

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

  @ApiPropertyOptional({ enum: EventSource, description: 'Фильтр по источнику: TC | TEPLOHOD | MANUAL' })
  @IsOptional()
  @IsEnum(EventSource)
  source?: EventSource;

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

  @ApiPropertyOptional({ description: 'Мин. цена от (копейки)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  priceMin?: number;

  @ApiPropertyOptional({ description: 'Макс. цена до (копейки)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  priceMax?: number;

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

  @ApiPropertyOptional({
    description: 'Только события с фото (для главной, блоков) — исключает из выдачи события без imageUrl',
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasPhoto?: boolean;

  @ApiPropertyOptional({ description: 'Фильтр по slug (через запятую) — для страницы избранного' })
  @IsOptional()
  @IsString()
  slugs?: string;

  @ApiPropertyOptional({ description: 'T12: bypass cache (nocache=1)' })
  @IsOptional()
  @IsString()
  nocache?: string;

  @ApiPropertyOptional({
    description: 'Набор полей в ответе: card (лёгкая карточка) или full (полные данные)',
    enum: ['card', 'full'],
  })
  @IsOptional()
  @IsIn(['card', 'full'])
  fields?: 'card' | 'full';
}
