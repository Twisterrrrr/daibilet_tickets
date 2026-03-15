import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class CreateSupplierPayoutRequestDto {
  @ApiProperty({ description: 'Сумма к выводу (в рублях, с копейками через точку)', example: 15000.5 })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ description: 'Комментарий для бухгалтера/админа', required: false, maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  comment?: string;
}

export class SupplierBalanceDto {
  @ApiProperty({ description: 'Текущий баланс по книге (рубли)' })
  currentBalance!: number;

  @ApiProperty({ description: 'Сумма в заявках на вывод со статусом NEW/APPROVED (рубли)' })
  pendingPayoutAmount!: number;

  @ApiProperty({ description: 'Доступный к запросу остаток (рубли)' })
  availableToRequest!: number;
}

