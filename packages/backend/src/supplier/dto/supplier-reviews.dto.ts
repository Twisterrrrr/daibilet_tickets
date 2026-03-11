import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { ReviewDisputeReasonCode } from '@prisma/client';

export class CreateSupplierResponseDto {
  @ApiProperty({ description: 'Текст ответа на отзыв', example: 'Благодарим за обратную связь...' })
  @IsString()
  @MinLength(10, { message: 'Минимум 10 символов' })
  @MaxLength(5000)
  text: string;
}

export class UpdateSupplierResponseDto {
  @ApiPropertyOptional({ description: 'Текст ответа (только для DRAFT)' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  text?: string;
}

export class CreateDisputeDto {
  @ApiProperty({ enum: ReviewDisputeReasonCode, description: 'Причина оспаривания' })
  @IsEnum(ReviewDisputeReasonCode)
  reasonCode: ReviewDisputeReasonCode;

  @ApiProperty({ description: 'Текст претензии', example: 'В отзыве указаны неверные факты...' })
  @IsString()
  @MinLength(20, { message: 'Минимум 20 символов' })
  @MaxLength(5000)
  claimText: string;

  @ApiProperty({ description: 'Подтверждение правдивости информации' })
  @IsBoolean()
  supplierConfirmedTruth: boolean;
}
