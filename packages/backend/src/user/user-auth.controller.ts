import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import type { UserAuthUser } from '../auth/auth.types';
import { UserLoginDto, UserRegisterDto } from './dto/user-auth.dto';
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
  async logout(@Req() req: Request & { user: UserAuthUser }, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.user.id);
    res.clearCookie('user_refresh_token');
    return { message: 'Logged out' };
  }

  @Get('me')
  @UseGuards(UserJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Профиль пользователя' })
  async me(@Req() req: Request & { user: UserAuthUser }) {
    return this.authService.getProfile(req.user.id);
  }
}
