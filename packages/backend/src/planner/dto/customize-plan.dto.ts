import { IsInt, IsUUID, IsObject, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CustomizePlanDto {
  @ApiProperty()
  @IsObject()
  variant: Record<string, unknown>;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  dayNumber: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  slotIndex: number;

  @ApiProperty()
  @IsUUID()
  newEventId: string;
}
