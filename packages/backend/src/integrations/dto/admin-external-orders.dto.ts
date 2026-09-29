import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

import { ExternalRefundRequestReason, ExternalRefundRequestStatus } from '@/prisma-client';

export class CreateExternalRefundRequestDto {
  @IsOptional()
  @IsEnum(ExternalRefundRequestReason)
  reason?: ExternalRefundRequestReason;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  reasonNote?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsUUID()
  assignedToAdminId?: string;
}

export class PatchExternalRefundRequestDto {
  @IsOptional()
  @IsEnum(ExternalRefundRequestStatus)
  status?: ExternalRefundRequestStatus;

  @IsOptional()
  @IsEnum(ExternalRefundRequestReason)
  reason?: ExternalRefundRequestReason;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  reasonNote?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsUUID()
  assignedToAdminId?: string;

  @IsOptional()
  @IsBoolean()
  unassign?: boolean;
}

