import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class AdminForgotPasswordDto {
  @ApiProperty({ example: 'admin@daibilet.ru' })
  @IsEmail()
  email!: string;
}

export class AdminResetPasswordDto {
  @ApiProperty({ description: 'Одноразовый токен из ссылки' })
  @IsString()
  @MinLength(32)
  token!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}
