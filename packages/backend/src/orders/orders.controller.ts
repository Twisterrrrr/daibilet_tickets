import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CheckoutService } from '../checkout/checkout.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Get(':id')
  @ApiOperation({ summary: 'T24: Публичный трекинг заказа по id (UUID session или shortCode)' })
  async getOrder(@Param('id') id: string) {
    const result = await this.checkoutService.getOrderById(id);
    if (!result) throw new NotFoundException('Заказ не найден');
    return result;
  }
}
