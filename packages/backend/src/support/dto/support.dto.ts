import { TicketCategory } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

// ============================================================
// Create support request DTO — POST /support/request
// ============================================================

export class CreateSupportRequestDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @IsOptional()
  @IsString()
  orderCode?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message: string;
}
