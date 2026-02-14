import { Controller, Post, Get, Body, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { SupplierAuthService } from './supplier-auth.service';
import { SupplierJwtGuard } from './supplier.guard';
import { SupplierRegisterDto, SupplierLoginDto } from './dto/supplier-auth.dto';

@ApiTags('supplier')
@Controller('supplier/auth')
export class SupplierAuthController {
  constructor(private readonly authService: SupplierAuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Регистрация поставщика' })
  async register(
    @Body() body: SupplierRegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register({
      ...body,
      companyName: body.companyName || body.name,
    });
    res.cookie('supplier_refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
    });
    return { accessToken: result.accessToken, operatorId: result.operatorId };
  }

  @Post('login')
  @ApiOperation({ summary: 'Вход поставщика' })
  async login(
    @Body() body: SupplierLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(body.email, body.password);
    res.cookie('supplier_refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return { accessToken: result.accessToken, operatorId: result.operatorId };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Обновить токены поставщика' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.supplier_refresh_token;
    if (!refreshToken) return { error: 'No refresh token' };

    const result = await this.authService.refresh(refreshToken);
    res.cookie('supplier_refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return { accessToken: result.accessToken };
  }

  @Post('logout')
  @UseGuards(SupplierJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Выход поставщика' })
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.user.id);
    res.clearCookie('supplier_refresh_token');
    return { message: 'Logged out' };
  }

  @Get('me')
  @UseGuards(SupplierJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Профиль поставщика' })
  async me(@Req() req: any) {
    return this.authService.getProfile(req.user.id);
  }
}
