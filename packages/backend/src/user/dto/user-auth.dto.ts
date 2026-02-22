import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UserRegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6, { message: 'Пароль минимум 6 символов' })
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UserLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
