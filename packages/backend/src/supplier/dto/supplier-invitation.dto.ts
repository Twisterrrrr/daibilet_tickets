import { ApiProperty } from '@nestjs/swagger';
import { SupplierRole } from '@/prisma-client';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';

export class CreateSupplierInvitationDto {
  @ApiProperty({ description: 'Email приглашаемого' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: SupplierRole, description: 'Роль (OWNER, MANAGER, CONTENT, ACCOUNTANT)' })
  @IsEnum(SupplierRole)
  role: SupplierRole;
}

export class AcceptSupplierInvitationDto {
  @ApiProperty({ description: 'Имя пользователя' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Пароль (мин. 8 символов)' })
  @IsString()
  @MinLength(8)
  password: string;
}
