import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, MinLength, ValidateIf } from 'class-validator';
import { SupplierLegalProfileStatus } from '@prisma/client';

const ALLOWED_STATUSES: SupplierLegalProfileStatus[] = ['VERIFIED', 'REJECTED'];

export class UpdateLegalProfileStatusDto {
  @ApiProperty({ enum: ALLOWED_STATUSES, description: 'Новый статус профиля' })
  @IsEnum(ALLOWED_STATUSES)
  status!: (typeof ALLOWED_STATUSES)[number];

  @ApiPropertyOptional({ description: 'Причина отказа (обязательна при status=REJECTED)' })
  @ValidateIf((o) => o.status === 'REJECTED')
  @IsString()
  @MinLength(1, { message: 'Причина отказа обязательна при отклонении профиля' })
  comment?: string;
}
