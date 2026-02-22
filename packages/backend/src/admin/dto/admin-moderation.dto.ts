import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RejectModerationDto {
  @ApiProperty({ description: 'Причина отклонения' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
