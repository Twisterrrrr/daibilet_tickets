import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';

import { UserForgotPasswordDto, UserLoginDto, UserRegisterDto, UserResetPasswordDto } from './dto/user-auth.dto';
import { UserJwtGuard } from './user.guard';
import { UserAuthService } from './user-auth.service';

@ApiTags('user')
@Controller('user/auth')
export class UserAuthController {
  constructor(private readonly authService: UserAuthService) {}

  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Регистрация пользователя сайта' })
  async register(@Body() body: UserRegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(body);
    res.cookie('user_refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return { accessToken: result.accessToken };
  }

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Вход пользователя' })
  async login(@Body() body: UserLoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(body.email, body.password);
    res.cookie('user_refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return { accessToken: result.accessToken };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Обновить токены' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.user_refresh_token;
    if (!refreshToken) {
      return { accessToken: null };
    }
    const result = await this.authService.refresh(refreshToken);
    res.cookie('user_refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return { accessToken: result.accessToken };
  }

  @Post('logout')
  @UseGuards(UserJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Выход' })
  async logout(@Req() req: { user: { id: string } }, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.user.id);
    res.clearCookie('user_refresh_token');
    return { message: 'Logged out' };
  }

  @Get('me')
  @UseGuards(UserJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Профиль пользователя' })
  async me(@Req() req: { user: { id: string } }) {
    return this.authService.getProfile(req.user.id);
  }

  @Post('forgot-password')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Запрос на сброс пароля (отправка ссылки на email)' })
  async forgotPassword(@Body() body: UserForgotPasswordDto) {
    await this.authService.requestPasswordReset(body.email);
    // Всегда возвращаем ok, чтобы не раскрывать, есть ли такой email
    return { ok: true };
  }

  @Post('reset-password')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Сброс пароля по токену' })
  async resetPassword(@Body() body: UserResetPasswordDto) {
    await this.authService.resetPassword(body.token, body.password);
    return { ok: true };
  }
}
