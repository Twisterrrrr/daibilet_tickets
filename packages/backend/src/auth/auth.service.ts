import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './jwt.strategy';
import { LoginBruteForceService } from './login-brute-force.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly bruteForce: LoginBruteForceService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async login(ip: string | undefined, email: string, password: string) {
    const clientIp = ip || 'unknown';

    const blocked = await this.bruteForce.checkBlocked(clientIp, email);
    if (blocked.blocked) {
      const msg = blocked.retryAfterSec
        ? `Слишком много попыток входа. Повторите через ${Math.ceil(blocked.retryAfterSec / 60)} мин.`
        : 'Слишком много попыток входа.';
      throw new UnauthorizedException(msg);
    }

    const user = await this.prisma.adminUser.findUnique({ where: { email } });

    if (!user) {
      const { blocked: nowBlocked, retryAfterSec } = await this.bruteForce.recordFailedAttempt(clientIp, email);
      if (nowBlocked) {
        const msg = retryAfterSec
          ? `Слишком много попыток входа. Повторите через ${Math.ceil(retryAfterSec / 60)} мин.`
          : 'Слишком много попыток входа.';
        throw new UnauthorizedException(msg);
      }
      throw new UnauthorizedException('Неверный email или пароль');
    }

    if (!user.isActive) {
      await this.bruteForce.recordFailedAttempt(clientIp, email);
      throw new UnauthorizedException('Аккаунт деактивирован');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      const { blocked: nowBlocked, retryAfterSec } = await this.bruteForce.recordFailedAttempt(clientIp, email);
      if (nowBlocked) {
        const msg = retryAfterSec
          ? `Слишком много попыток входа. Повторите через ${Math.ceil(retryAfterSec / 60)} мин.`
          : 'Слишком много попыток входа.';
        throw new UnauthorizedException(msg);
      }
      throw new UnauthorizedException('Неверный email или пароль');
    }

    await this.bruteForce.recordSuccess(clientIp, email);

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

  /**
   * Запрос сброса пароля админа: одноразовый токен (храним только SHA-256), письмо со ссылкой.
   * Не раскрываем наличие email; токены не логируем.
   */
  async requestAdminPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.adminUser.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' } },
    });

    if (!user?.isActive) return;

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: expiresAt },
    });

    const adminBase = (this.config.get<string>('ADMIN_APP_URL') || this.config.get<string>('APP_URL') || 'http://localhost:5173').replace(
      /\/$/,
      '',
    );
    const resetUrl = `${adminBase}/reset-password?token=${rawToken}`;

    await this.mail.sendAdminPasswordReset(user.email, { name: user.name, resetUrl });
  }

  async resetAdminPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = this.hashToken(token.trim());
    const user = await this.prisma.adminUser.findFirst({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Ссылка для сброса пароля недействительна или устарела');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        refreshTokenHash: null,
      },
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
