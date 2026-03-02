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

// ─── Nested: Create Event Offer ────────────────────────────────────

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
