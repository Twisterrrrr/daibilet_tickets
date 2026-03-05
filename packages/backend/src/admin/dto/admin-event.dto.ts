import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  DateMode,
  EditorStatus,
  EventAudience,
  EventCategory,
  EventSubcategory,
  OfferSource,
  OfferStatus,
  PurchaseType,
  SubcategoriesMode,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

// ─── Event Quality (readiness) ──────────────────────────────────────

export class EventQualityIssueDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  message!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  field?: string;

  @ApiProperty({ enum: ['BLOCKING', 'WARNING'] })
  @IsString()
  severity!: 'BLOCKING' | 'WARNING';

  @ApiProperty({ enum: ['main', 'location', 'offers', 'schedule'] })
  @IsString()
  tabKey!: 'main' | 'location' | 'offers' | 'schedule';
}

export class EventQualityDto {
  @ApiProperty()
  @IsBoolean()
  isSellable!: boolean;

  @ApiProperty({ type: [EventQualityIssueDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventQualityIssueDto)
  issues!: EventQualityIssueDto[];
}

// ─── Nested: Create Event Offer ────────────────────────────────────

export class AdminEventSessionRowDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  startsAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endsAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  capacity?: number | null;

  @ApiProperty()
  @IsInt()
  soldCount!: number;

  @ApiProperty()
  @IsBoolean()
  locked!: boolean;

  @ApiPropertyOptional({ enum: ['SOLD', 'PAST', 'IMPORTED', 'OTHER'] })
  @IsOptional()
  @IsString()
  lockReason?: 'SOLD' | 'PAST' | 'IMPORTED' | 'OTHER';

  @ApiProperty()
  @IsBoolean()
  isCancelled!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  canceledAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cancelReason?: string | null;
}

export class AdminEventSessionsRangeDto {
  @ApiProperty()
  @IsString()
  eventId!: string;

  @ApiProperty()
  @IsString()
  from!: string;

  @ApiProperty()
  @IsString()
  to!: string;

  @ApiProperty({ description: 'Количество отменённых сеансов в выбранном диапазоне' })
  @IsInt()
  cancelledCount!: number;

  @ApiProperty({ type: [AdminEventSessionRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminEventSessionRowDto)
  rows!: AdminEventSessionRowDto[];
}

export class AdminCreateSessionDto {
  @ApiProperty({ description: 'Дата/время начала сеанса (ISO 8601)' })
  @IsISO8601()
  startsAt!: string;

  @ApiPropertyOptional({ description: 'Дата/время окончания сеанса (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  endsAt?: string | null;

  @ApiPropertyOptional({ description: 'Вместимость слота; если не задана, используется Event.defaultCapacityTotal' })
  @IsOptional()
  @IsInt()
  capacity?: number | null;
}

// ─── Batch Create Sessions ────────────────────────────────────────────

export class BatchCreateSessionSlotDto {
  @ApiProperty({ description: 'Дата/время начала сеанса (ISO 8601)' })
  @IsISO8601()
  startsAt!: string;

  @ApiPropertyOptional({
    description: 'Вместимость слота; если не задана, используется Event.defaultCapacityTotal',
  })
  @IsOptional()
  @IsInt()
  capacityTotal?: number | null;

  @ApiPropertyOptional({ description: 'Флаг активности; по умолчанию true' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BatchCreateEventSessionsDto {
  @ApiProperty({ type: [BatchCreateSessionSlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchCreateSessionSlotDto)
  slots!: BatchCreateSessionSlotDto[];
}

export class AdminUpdateSessionDto {
  @ApiPropertyOptional({ description: 'Новая дата/время начала (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @ApiPropertyOptional({ description: 'Новая дата/время окончания (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  endsAt?: string | null;

  @ApiPropertyOptional({ description: 'Новая вместимость слота' })
  @IsOptional()
  @IsInt()
  capacity?: number | null;
}

export class AdminStopSessionDto {
  @ApiPropertyOptional({ description: 'Причина остановки/отмены сеанса (для аудита)' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AdminCancelSessionDto {
  @ApiPropertyOptional({ description: 'Причина отмены сеанса (для аудита)' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateEventOfferDto {
  @ApiProperty({ enum: OfferSource })
  @IsEnum(OfferSource)
  source: OfferSource;

  @ApiProperty({ enum: PurchaseType })
  @IsEnum(PurchaseType)
  purchaseType: PurchaseType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalEventId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaEventId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  deeplink?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  priceFrom?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  commissionPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ enum: OfferStatus })
  @IsOptional()
  @IsEnum(OfferStatus)
  status?: OfferStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  availabilityMode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  badge?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  operatorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  widgetProvider?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  widgetPayload?: object;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meetingPoint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meetingInstructions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  operationalPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  operationalNote?: string;
}

// ─── Update Event Offer (full update via PUT) ──────────────────────

export class UpdateEventOfferDto extends PartialType(CreateEventOfferDto) {}

// ─── Patch Event Offer (partial: status, isPrimary, priority, commission) ──

export class PatchEventOfferDto {
  @ApiPropertyOptional({ enum: OfferStatus })
  @IsOptional()
  @IsEnum(OfferStatus)
  status?: OfferStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  commissionPercent?: number;
}

// ─── Create Event (with optional nested offer) ─────────────────────

export class CreateEventDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsUUID()
  cityId: string;

  @ApiProperty({ enum: EventCategory })
  @IsEnum(EventCategory)
  category: EventCategory;

  @ApiPropertyOptional({ enum: EventSubcategory, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(EventSubcategory, { each: true })
  subcategories?: EventSubcategory[];

  @ApiPropertyOptional({ enum: EventAudience })
  @IsOptional()
  @IsEnum(EventAudience)
  audience?: EventAudience;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  galleryUrls?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  durationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  minAge?: number;

  @ApiPropertyOptional({ type: CreateEventOfferDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateEventOfferDto)
  offer?: CreateEventOfferDto;

  @ApiPropertyOptional({ description: 'Template fields by category' })
  @IsOptional()
  @IsObject()
  templateData?: Record<string, unknown>;
}

// ─── Override Event (all optional, merges onto sync data) ──────────

export class OverrideEventDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({ enum: EventCategory, nullable: true, description: 'null = сбросить к sync' })
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsEnum(EventCategory)
  category?: EventCategory | null;

  @ApiPropertyOptional({ enum: EventSubcategory, isArray: true, description: '[] = сбросить к sync' })
  @IsOptional()
  @IsArray()
  @IsEnum(EventSubcategory, { each: true })
  subcategories?: EventSubcategory[];

  @ApiPropertyOptional({ enum: EventAudience })
  @IsOptional()
  @IsEnum(EventAudience)
  audience?: EventAudience;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  minAge?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  manualRating?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagsAdd?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagsRemove?: string[];

  @ApiPropertyOptional({
    description: 'Category-specific: route, menu, shipName (EXCURSION); program, cast, hall (EVENT)',
  })
  @IsOptional()
  @IsObject()
  templateData?: Record<string, unknown>;

  @ApiPropertyOptional({
    enum: EditorStatus,
    description: 'Очередь постредакции: NEEDS_REVIEW | IN_PROGRESS | PUBLISHED | REJECTED',
  })
  @IsOptional()
  @IsEnum(EditorStatus)
  editorStatus?: EditorStatus;

  @ApiPropertyOptional({
    enum: SubcategoriesMode,
    description: 'Режим подкатегорий: INHERIT=из sync, OVERRIDE=свой список, CLEAR=пусто',
  })
  @IsOptional()
  @IsEnum(SubcategoriesMode)
  subcategoriesMode?: SubcategoriesMode;

  @ApiPropertyOptional({ enum: EventSubcategory, isArray: true, description: 'При subcategoriesMode=OVERRIDE' })
  @IsOptional()
  @IsArray()
  @IsEnum(EventSubcategory, { each: true })
  subcategoriesOverride?: EventSubcategory[];
}

// ─── Venue Settings ────────────────────────────────────────────────

export class VenueSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  venueId?: string | null;

  @ApiPropertyOptional({ description: 'Адрес / место проведения (строка), опционально' })
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiPropertyOptional({ enum: DateMode })
  @IsOptional()
  @IsEnum(DateMode)
  dateMode?: DateMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPermanent?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  endDate?: string | null;
}

// ─── Event Activation ────────────────────────────────────────────────

export class EventActivationDto {
  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;
}

// ─── External Rating ───────────────────────────────────────────────

export class ExternalRatingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  externalRating?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  externalReviewCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalSource?: string;
}
