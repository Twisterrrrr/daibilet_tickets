import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.adminUser.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Аккаунт деактивирован');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwt.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwt.sign(payload, { expiresIn: '30d' });

    // Хэшируем refresh token и сохраняем в БД
    const refreshTokenHash = this.hashToken(refreshToken);

    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), refreshTokenHash },
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify<JwtPayload>(refreshToken);
      const user = await this.prisma.adminUser.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, name: true, role: true, isActive: true, refreshTokenHash: true },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Пользователь не найден или деактивирован');
      }

      // Проверяем, что refresh token не был инвалидирован
      const tokenHash = this.hashToken(refreshToken);
      if (user.refreshTokenHash !== tokenHash) {
        throw new UnauthorizedException('Refresh token инвалидирован');
      }

      const newPayload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
      const newAccessToken = this.jwt.sign(newPayload, { expiresIn: '15m' });
      const newRefreshToken = this.jwt.sign(newPayload, { expiresIn: '30d' });

      // Обновляем хэш refresh token (ротация)
      const newRefreshHash = this.hashToken(newRefreshToken);
      await this.prisma.adminUser.update({
        where: { id: user.id },
        data: { refreshTokenHash: newRefreshHash },
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      };
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException('Невалидный refresh token');
    }
  }

  async logout(userId: string) {
    // Инвалидируем refresh token
    await this.prisma.adminUser.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.adminUser.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, lastLoginAt: true, createdAt: true },
    });

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    return user;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
