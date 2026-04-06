import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** Тело POST /admin/refunds (MVP). */
export class CreateAdminRefundDto {
  @IsUUID()
  itemId!: string;

  /** Одно из: USER_REQUEST | EVENT_CANCELLED | SUPPORT | OTHER (иначе OTHER). */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reasonNote?: string;
}
