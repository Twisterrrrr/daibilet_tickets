import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectModerationDto {
  @ApiProperty({ description: 'Причина отклонения' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
