import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { UserJwtGuard } from '../user/user.guard';
import { AccountService } from './account.service';
import { UpdateAccountProfileDto } from './dto/account.dto';

interface RequestWithUser {
  user: { id: string };
}

@ApiTags('account')
@Controller('account')
@UseGuards(UserJwtGuard)
@ApiBearerAuth()
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Get('me')
  @ApiOperation({ summary: 'Сводка ЛК: пользователь, счётчики заказов, билетов, избранного' })
  getMe(@Req() req: RequestWithUser) {
    return this.account.getSummary(req.user.id);
  }

  @Get('purchases')
  @ApiOperation({ summary: 'Единый список покупок/бронирований (карточки по типам)' })
  getPurchases(
    @Req() req: RequestWithUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.account.getPurchases(req.user.id, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('orders')
  @ApiOperation({ summary: 'Список заказов текущего пользователя' })
  getOrders(
    @Req() req: RequestWithUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.account.getOrders(req.user.id, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Деталь заказа (только свой)' })
  getOrderDetail(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.account.getOrderDetail(req.user.id, id);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'Список билетов по оплаченным заказам' })
  getTickets(@Req() req: RequestWithUser) {
    return this.account.getTickets(req.user.id);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Профиль пользователя' })
  getProfile(@Req() req: RequestWithUser) {
    return this.account.getProfile(req.user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Обновить профиль (имя, email)' })
  updateProfile(@Req() req: RequestWithUser, @Body() body: UpdateAccountProfileDto) {
    return this.account.updateProfile(req.user.id, body);
  }
}
