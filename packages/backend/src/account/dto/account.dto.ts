import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import type { ReviewStatus } from '@prisma/client';

/** Тип карточки покупки для единого экрана «Мои покупки» */
export type PurchaseDisplayType =
  | 'INTERNAL_TICKET'
  | 'EXTERNAL_VOUCHER'
  | 'BOOKING_CONFIRMATION'
  | 'AWAITING_PAYMENT'
  | 'MANUAL_CONFIRMATION';

export class PurchaseActionDto {
  @ApiPropertyOptional()
  label!: string;

  @ApiPropertyOptional()
  url!: string;
}

export class PurchaseListItemDto {
  @ApiPropertyOptional({ description: 'ID сессии (или составной ключ)' })
  purchaseId!: string;

  @ApiPropertyOptional()
  shortCode!: string;

  @ApiPropertyOptional()
  eventTitle!: string;

  @ApiPropertyOptional()
  purchaseDate!: string;

  @ApiPropertyOptional()
  eventDate!: string | null;

  @ApiPropertyOptional({ description: 'Человекочитаемый статус' })
  displayStatus!: string;

  @ApiPropertyOptional({ enum: ['INTERNAL_TICKET', 'EXTERNAL_VOUCHER', 'BOOKING_CONFIRMATION', 'AWAITING_PAYMENT', 'MANUAL_CONFIRMATION'] })
  purchaseType!: PurchaseDisplayType;

  @ApiPropertyOptional({ description: 'Есть ли билет/ваучер для открытия' })
  ticketAvailable!: boolean;

  @ApiPropertyOptional()
  primaryAction!: PurchaseActionDto | null;

  @ApiPropertyOptional()
  secondaryAction!: PurchaseActionDto | null;
}

export class AccountSummaryDto {
  @ApiPropertyOptional()
  user!: { id: string; name: string; email: string };

  @ApiPropertyOptional()
  ordersCount!: number;

  @ApiPropertyOptional()
  activeTicketsCount!: number;

  @ApiPropertyOptional()
  favoritesCount!: number;
}

export class AccountOrderListItemDto {
  @ApiPropertyOptional()
  id!: string;

  @ApiPropertyOptional()
  shortCode!: string;

  @ApiPropertyOptional()
  createdAt!: string;

  @ApiPropertyOptional()
  status!: string;

  @ApiPropertyOptional()
  paymentStatus!: string;

  @ApiPropertyOptional()
  totalAmount!: number | null;

  @ApiPropertyOptional()
  currency!: string;

  @ApiPropertyOptional()
  itemsPreview!: Array<{ eventTitle: string; quantity: number }>;

  @ApiPropertyOptional()
  trackUrl!: string | null;
}

export class AccountTicketItemDto {
  @ApiPropertyOptional()
  orderId!: string;

  @ApiPropertyOptional()
  shortCode!: string;

  @ApiPropertyOptional()
  eventTitle!: string;

  @ApiPropertyOptional()
  eventSlug!: string;

  @ApiPropertyOptional()
  sessionStartsAt!: string | null;

  @ApiPropertyOptional()
  status!: string;

  @ApiPropertyOptional()
  trackUrl!: string;

  @ApiPropertyOptional()
  externalPaymentUrl!: string | null;
}

export class AccountReviewItemDto {
  id!: string;
  eventId!: string | null;
  eventSlug!: string | null;
  eventTitle!: string;
  cityName!: string | null;
  rating!: number;
  text!: string;
  status!: ReviewStatus;
  createdAt!: string;
  updatedAt!: string;
  hasDispute!: boolean;
  unreadDisputeMessagesCount!: number;
}

export class AccountReviewsResponseDto {
  items!: AccountReviewItemDto[];
  total!: number;
  page!: number;
  totalPages!: number;
}

export class UpdateAccountProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;
}
