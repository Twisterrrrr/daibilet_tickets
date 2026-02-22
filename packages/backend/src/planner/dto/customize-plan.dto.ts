import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsObject, IsUUID, Min } from 'class-validator';

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
