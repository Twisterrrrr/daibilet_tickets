import { Controller, Post, Get, Body, UseGuards, Request, Res, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dto/login.dto';

const REFRESH_COOKIE = 'daibilet_refresh';
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto.email, dto.password);

    this.setRefreshCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Request() req: any,
    @Body('refreshToken') bodyToken: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Берём refresh token из cookie или из body (для обратной совместимости)
    const refreshToken = req.cookies?.[REFRESH_COOKIE] || bodyToken;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token не найден' });
    }

    const result = await this.auth.refresh(refreshToken);

    this.setRefreshCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(200)
  async logout(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.user.id);
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    return { success: true };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Request() req: any) {
    return this.auth.getProfile(req.user.id);
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: REFRESH_MAX_AGE,
      path: '/',
    });
  }
}
