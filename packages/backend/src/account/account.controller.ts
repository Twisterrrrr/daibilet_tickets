import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReviewStatus } from '@/prisma-client';

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

  @Get('reviews')
  @ApiOperation({ summary: 'Список отзывов текущего пользователя' })
  getReviews(
    @Req() req: RequestWithUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: ReviewStatus,
  ) {
    return this.account.getReviews(req.user.id, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
    });
  }

  @Get('reviews/:id/dispute')
  @ApiOperation({ summary: 'Диалог по спору к отзыву' })
  getReviewDispute(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.account.getReviewDispute(req.user.id, id);
  }

  @Post('reviews/:id/dispute/messages')
  @ApiOperation({ summary: 'Отправить сообщение в спор по отзыву' })
  postReviewDisputeMessage(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: { body: string },
  ) {
    return this.account.postReviewDisputeMessage(req.user.id, id, body.body);
  }

  @Post('reviews/:id/dispute/read')
  @ApiOperation({ summary: 'Пометить сообщения спора по отзыву как прочитанные пользователем' })
  markReviewDisputeRead(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.account.markReviewDisputeRead(req.user.id, id);
  }

  @Get('notifications/unread-count')
  @ApiOperation({ summary: 'Счётчик непрочитанных уведомлений ЛК' })
  getNotificationsUnreadCount(@Req() req: RequestWithUser) {
    return this.account.getNotificationsUnreadCount(req.user.id);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Список уведомлений текущего пользователя' })
  getNotifications(
    @Req() req: RequestWithUser,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.account.getNotifications(req.user.id, {
      type: type || undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('notifications/:id/read')
  @ApiOperation({ summary: 'Пометить уведомление как прочитанное' })
  markNotificationRead(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.account.markNotificationRead(req.user.id, id);
  }

  @Post('notifications/read-all')
  @ApiOperation({ summary: 'Пометить все уведомления как прочитанные' })
  markAllNotificationsRead(@Req() req: RequestWithUser) {
    return this.account.markAllNotificationsRead(req.user.id);
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
