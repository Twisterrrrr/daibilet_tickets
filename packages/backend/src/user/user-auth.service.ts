import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import type { UserJwtPayload } from './user-jwt.strategy';

@Injectable()
export class UserAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(data: { email: string; password: string; name: string }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) throw new ConflictException('Email уже зарегистрирован');

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
      },
    });

    return this.issueTokens(user.id, user.email);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) throw new UnauthorizedException('Неверный email или пароль');
    if (!user.isActive) throw new UnauthorizedException('Аккаунт деактивирован');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Неверный email или пароль');

    return this.issueTokens(user.id, user.email);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify<UserJwtPayload>(refreshToken);
      if (payload.type !== 'user') throw new UnauthorizedException('Невалидный тип токена');

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, isActive: true, refreshTokenHash: true },
      });

      if (!user || !user.isActive) throw new UnauthorizedException('Аккаунт недоступен');

      const tokenHash = this.hashToken(refreshToken);
      if (user.refreshTokenHash !== tokenHash) {
        throw new UnauthorizedException('Refresh token инвалидирован');
      }

      return this.issueTokens(user.id, user.email);
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException('Невалидный refresh token');
    }
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }

  private async issueTokens(userId: string, email: string) {
    const payload: UserJwtPayload = {
      sub: userId,
      email,
      type: 'user',
    };

    const accessToken = this.jwt.sign(payload, { expiresIn: '7d' });
    const refreshToken = this.jwt.sign(payload, { expiresIn: '30d' });

    const refreshTokenHash = this.hashToken(refreshToken);
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date(), refreshTokenHash },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
