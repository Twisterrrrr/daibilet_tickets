import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ChatStartDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message: string;

  /**
   * Honeypot field (hidden input). If filled — likely a bot.
   * We keep it optional and treat non-empty as invalid.
   */
  @IsOptional()
  @IsString()
  honey?: string;
}

export class ChatSendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  text: string;

  @IsOptional()
  @IsString()
  honey?: string;
}

