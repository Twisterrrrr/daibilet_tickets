import {
  IsOptional, IsNumber, IsArray,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdatePricingDto {
  @ApiPropertyOptional({ description: 'Сервисный сбор (%)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  serviceFeePercent?: number;

  @ApiPropertyOptional({ description: 'Наценка в пиковые периоды (%)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  peakMarkupPercent?: number;

  @ApiPropertyOptional({ description: 'Скидка last-minute (%)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lastMinutePercent?: number;

  @ApiPropertyOptional({ description: 'Комиссия TC (%)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tcCommissionPercent?: number;

  @ApiPropertyOptional({ description: 'JSON: [{dateFrom, dateTo, cities?}]' })
  @IsOptional()
  @IsArray()
  peakRanges?: any[];
}
