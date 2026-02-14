import {
  IsString,
  IsUUID,
  IsInt,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsISO8601,
  Min,
  Max,
} from 'class-validator';

// ============================================================
// Create review DTO — POST /reviews
// ============================================================

export class CreateReviewDto {
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsOptional()
  @IsUUID()
  venueId?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  @IsNotEmpty()
  text: string;

  @IsString()
  @IsNotEmpty()
  authorName: string;

  @IsEmail()
  authorEmail: string;

  @IsOptional()
  @IsString()
  voucherCode?: string;

  /** Honeypot field — if filled, submission is rejected */
  @IsOptional()
  @IsString()
  website?: string;

  /** Timestamp when the form was first focused (ISO 8601) */
  @IsOptional()
  @IsISO8601()
  formStartedAt?: string;

  /** Token from ReviewRequest (post-purchase email flow) */
  @IsOptional()
  @IsString()
  reviewRequestToken?: string;
}
