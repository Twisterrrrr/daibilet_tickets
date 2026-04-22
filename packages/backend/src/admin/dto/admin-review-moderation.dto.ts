import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { ReviewDisputeStatus } from '@/prisma-client';

export class RejectSupplierResponseDto {
  @ApiPropertyOptional({ description: 'Причина отклонения' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  moderationComment?: string;
}

const RESOLVE_STATUSES: ReviewDisputeStatus[] = ['RESOLVED_KEEP', 'RESOLVED_EDIT', 'RESOLVED_HIDE', 'RESOLVED_DELETE'];

export class ResolveDisputeDto {
  @ApiProperty({ enum: RESOLVE_STATUSES })
  @IsEnum(RESOLVE_STATUSES)
  status: ReviewDisputeStatus;

  @ApiPropertyOptional({ description: 'Комментарий модератора' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  decisionComment?: string;
}
