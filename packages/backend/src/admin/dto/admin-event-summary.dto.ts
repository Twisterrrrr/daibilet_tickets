import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

/** Единый read-model для админки события (GET /admin/events/:id/summary) */
export class EventAdminReadinessChecklistDto {
  @ApiProperty()
  @IsBoolean()
  hasImage!: boolean;

  @ApiProperty()
  @IsBoolean()
  hasDescription!: boolean;

  @ApiProperty()
  @IsBoolean()
  hasFutureSlots!: boolean;

  @ApiProperty()
  @IsBoolean()
  hasPrice!: boolean;

  @ApiProperty()
  @IsBoolean()
  hasVenue!: boolean;

  @ApiProperty()
  @IsBoolean()
  hasCategory!: boolean;

  @ApiProperty()
  @IsBoolean()
  hasAge!: boolean;
}

export class EventAdminReadinessIssueDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  message!: string;

  @ApiProperty({ enum: ['warning', 'error'] })
  @IsEnum(['warning', 'error'] as const)
  severity!: 'warning' | 'error';
}

export class EventAdminReadinessDto {
  @ApiProperty({ enum: ['READY', 'NEEDS_WORK', 'BLOCKED'] })
  @IsEnum(['READY', 'NEEDS_WORK', 'BLOCKED'] as const)
  status!: 'READY' | 'NEEDS_WORK' | 'BLOCKED';

  @ApiProperty({
    description: 'Сводный скор готовности 0..100 (derived)',
    minimum: 0,
    maximum: 100,
  })
  @IsInt()
  score!: number;

  @ApiProperty({ enum: ['LINKS', 'LEGACY_ENUM', 'NONE'] })
  @IsEnum(['LINKS', 'LEGACY_ENUM', 'NONE'] as const)
  classificationSource!: 'LINKS' | 'LEGACY_ENUM' | 'NONE';

  @ApiProperty({
    description: 'Требуется ручная проверка классификации (derived)',
  })
  @IsBoolean()
  classificationNeedsReview!: boolean;

  @ApiProperty({ type: EventAdminReadinessChecklistDto })
  @ValidateNested()
  @Type(() => EventAdminReadinessChecklistDto)
  checklist!: EventAdminReadinessChecklistDto;

  @ApiProperty({ type: [EventAdminReadinessIssueDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventAdminReadinessIssueDto)
  issues!: EventAdminReadinessIssueDto[];
}

export class EventAdminPromotionDto {
  @ApiProperty({ enum: ['NONE', 'POPULAR', 'TOP'] })
  @IsEnum(['NONE', 'POPULAR', 'TOP'] as const)
  tier!: 'NONE' | 'POPULAR' | 'TOP';

  @ApiProperty()
  @IsInt()
  manualBoost!: number;

  @ApiPropertyOptional({ description: 'Короткое пояснение для UI (с backend)' })
  @IsOptional()
  @IsString()
  helpText?: string;
}

export class EventAdminOperationsCapacityDto {
  @ApiProperty()
  @IsInt()
  total!: number;

  @ApiProperty()
  @IsInt()
  sold!: number;

  @ApiProperty()
  @IsInt()
  available!: number;
}

export class EventAdminOperationsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nextSessionAt!: string | null;

  @ApiProperty()
  @IsInt()
  futureSessionsCount!: number;

  @ApiProperty({ type: EventAdminOperationsCapacityDto })
  @ValidateNested()
  @Type(() => EventAdminOperationsCapacityDto)
  capacity!: EventAdminOperationsCapacityDto;
}

export class EventAdminCommercialDto {
  @ApiProperty()
  @IsInt()
  last30dOrders!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  conversionRate!: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  refundsRate!: number | null;

  @ApiPropertyOptional({
    description: 'STUB | PARTIAL — честная пометка качества данных',
  })
  @IsOptional()
  @IsString()
  dataQuality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class EventAdminIntegrationDto {
  @ApiProperty()
  @IsString()
  source!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastSyncAt!: string | null;

  @ApiProperty({ enum: ['OK', 'WARNING', 'ERROR'] })
  @IsEnum(['OK', 'WARNING', 'ERROR'] as const)
  syncStatus!: 'OK' | 'WARNING' | 'ERROR';

  @ApiProperty()
  @IsBoolean()
  hasDuplicates!: boolean;
}

export class EventAdminSummaryDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty({ type: EventAdminReadinessDto })
  @ValidateNested()
  @Type(() => EventAdminReadinessDto)
  readiness!: EventAdminReadinessDto;

  @ApiProperty({ type: EventAdminPromotionDto })
  @ValidateNested()
  @Type(() => EventAdminPromotionDto)
  promotion!: EventAdminPromotionDto;

  @ApiProperty({ type: EventAdminOperationsDto })
  @ValidateNested()
  @Type(() => EventAdminOperationsDto)
  operations!: EventAdminOperationsDto;

  @ApiProperty({ type: EventAdminCommercialDto })
  @ValidateNested()
  @Type(() => EventAdminCommercialDto)
  commercial!: EventAdminCommercialDto;

  @ApiProperty({ type: EventAdminIntegrationDto })
  @ValidateNested()
  @Type(() => EventAdminIntegrationDto)
  integration!: EventAdminIntegrationDto;
}
