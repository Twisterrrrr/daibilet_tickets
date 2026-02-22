import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

// ============================================================
// Cart item DTO
// ============================================================

export class CartItemDto {
  @IsUUID()
  eventId: string;

  @IsUUID()
  offerId: string;

  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  eventTitle: string;

  @IsString()
  eventSlug: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  priceFrom: number;

  @IsString()
  purchaseType: string;

  @IsString()
  source: string;

  @IsOptional()
  @IsString()
  deeplink?: string;

  @IsOptional()
  @IsString()
  badge?: string;
}

// ============================================================
// Customer info DTO
// ============================================================

export class CustomerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;
}

// ============================================================
// UTM parameters DTO
// ============================================================

export class UtmDto {
  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  medium?: string;

  @IsOptional()
  @IsString()
  campaign?: string;
}

// ============================================================
// Gift certificate checkout DTO — POST /checkout/gift-certificate
// ============================================================

export class CreateGiftCertificateCheckoutDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount: number; // копейки

  @IsEmail()
  recipientEmail: string;

  @IsString()
  @IsNotEmpty()
  senderName: string;

  @IsOptional()
  @IsString()
  message?: string;

  @ValidateNested()
  @Type(() => CustomerDto)
  customer: CustomerDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UtmDto)
  utm?: UtmDto;

  @IsOptional()
  @IsString()
  referrer?: string;
}

// ============================================================
// Create checkout session DTO  — POST /checkout/session
// ============================================================

export class CreateCheckoutSessionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];

  @ValidateNested()
  @Type(() => CustomerDto)
  customer: CustomerDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UtmDto)
  utm?: UtmDto;

  @IsOptional()
  @IsString()
  referrer?: string;

  @IsOptional()
  @IsString()
  giftCertificateCode?: string;
}

// ============================================================
// Create CheckoutPackage DTO — POST /checkout/package
// ============================================================

export class CreatePackageItemDto {
  @IsString()
  type: 'SESSION' | 'OPEN_DATE';

  @IsUUID()
  offerId: string;

  @IsOptional()
  @IsUUID()
  sessionId?: string | null;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  openDate?: string | null;

  @IsInt()
  @Min(1)
  qty: number;
}

export class CreatePackageDto {
  @IsUUID()
  checkoutSessionId: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePackageItemDto)
  items: CreatePackageItemDto[];
}

export class ValidateGiftCertificateDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsInt()
  @Min(1)
  cartTotalKopecks: number;
}

// ============================================================
// Validate cart DTO — POST /checkout/validate
// ============================================================

export class ValidateCartDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];
}

// ============================================================
// Create quick order request DTO — POST /checkout/request
// ============================================================

export class CreateOrderRequestDto {
  @IsUUID()
  eventId: string;

  @IsOptional()
  @IsUUID()
  offerId?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  comment?: string;
}

// ============================================================
// Pay DTO — POST /checkout/:sessionId/pay
// ============================================================

export class PayDto {
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

// ============================================================
// Payment webhook DTO — POST /checkout/webhook/payment
// ============================================================

export class PaymentWebhookDto {
  @IsString()
  @IsNotEmpty()
  paymentIntentId: string;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsOptional()
  @IsString()
  providerPaymentId?: string;

  @IsOptional()
  @IsString()
  failReason?: string;
}

// ============================================================
// YooKassa webhook DTO — POST /checkout/webhook/yookassa
// (loose shape — YooKassa sends deeply nested objects)
// ============================================================

export class YookassaWebhookDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  event?: string;

  @IsOptional()
  object?: Record<string, any>;
}

// ============================================================
// TC order DTO — POST /checkout/tc
// ============================================================

export class TcOrderItemDto {
  @IsString()
  setId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateTcOrderDto {
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TcOrderItemDto)
  items: TcOrderItemDto[];

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerName?: string;
}

// ============================================================
// Trip Planner checkout DTO — POST /checkout (Trip Planner packages)
// ============================================================

export class PlanSlotDto {
  @IsOptional()
  slot?: string;

  @IsOptional()
  time?: string;

  @IsOptional()
  event?: Record<string, unknown>;

  @IsOptional()
  session?: Record<string, unknown>;

  @IsOptional()
  tickets?: Record<string, unknown>;

  @IsOptional()
  subtotal?: number;
}

export class PlanDayDto {
  @IsOptional()
  @IsString()
  date?: string;

  @IsInt()
  @Min(1)
  dayNumber: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanSlotDto)
  slots: PlanSlotDto[];
}

export class PlanVariantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  tier?: string;

  @IsOptional()
  totalPrice?: number;

  @IsOptional()
  serviceFee?: number;

  @IsOptional()
  grandTotal?: number;

  @IsOptional()
  perPerson?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanDayDto)
  days: PlanDayDto[];
}

export class CreateTripPlanCheckoutDto {
  @ValidateNested()
  @Type(() => PlanVariantDto)
  variant: PlanVariantDto;

  @ValidateNested()
  @Type(() => CustomerDto)
  customer: CustomerDto;

  @IsString()
  @IsNotEmpty()
  returnUrl: string;
}
