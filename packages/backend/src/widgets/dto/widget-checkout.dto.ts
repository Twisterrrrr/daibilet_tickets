import { IsEmail, IsInt, IsOptional, IsString, IsUUID, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class WidgetCheckoutBuyerDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  phone!: string;
}

export class WidgetCheckoutRequestDto {
  @IsUUID()
  eventId!: string;

  @IsUUID()
  sessionId!: string;

  @IsInt()
  @Min(1)
  @Max(10)
  qty!: number;

  @ValidateNested()
  @Type(() => WidgetCheckoutBuyerDto)
  buyer!: WidgetCheckoutBuyerDto;

  @IsOptional()
  @IsString()
  lang?: string;

  @IsOptional()
  @IsString()
  returnUrl?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class WidgetCheckoutResponseDto {
  checkoutSessionId!: string;
  shortCode!: string;
  expiresAt!: string;
  redirectUrl!: string;
}
