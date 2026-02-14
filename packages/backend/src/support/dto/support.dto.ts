import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { TicketCategory } from '@prisma/client';

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
