import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupplierRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { SupplierJwtPayload } from './supplier-jwt.strategy';

@Injectable()
export class SupplierAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Регистрация поставщика: создаёт Operator + SupplierUser (OWNER).
   */
  async register(data: {
    email: string;
    password: string;
    name: string;
    companyName: string;
    inn?: string;
    contactPhone?: string;
    website?: string;
  }) {
    // Проверяем уникальность email
    const existing = await this.prisma.supplierUser.findUnique({
      where: { email: data.email },
    });
    if (existing) throw new ConflictException('Email уже зарегистрирован');

    const passwordHash = await bcrypt.hash(data.password, 10);
    const slug =
      data.companyName
        .toLowerCase()
        .replace(/[^a-zа-яё0-9]/gi, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      Date.now().toString(36);

    // Транзакция: Operator + SupplierUser
    const result = await this.prisma.$transaction(async (tx) => {
      const operator = await tx.operator.create({
        data: {
          name: data.companyName,
          slug,
          website: data.website || null,
          isActive: true,
          isSupplier: true,
          trustLevel: 0,
          commissionRate: 0.25, // базовая 25% для всех
          promoRate: 0.10, // 10% промо (включает YooKassa)
          promoUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 месяца
          companyName: data.companyName,
          inn: data.inn || null,
          contactEmail: data.email,
          contactPhone: data.contactPhone || null,
        },
      });

      const user = await tx.supplierUser.create({
        data: {
          operatorId: operator.id,
          email: data.email,
          passwordHash,
          name: data.name,
          role: 'OWNER',
        },
      });

      return { operator, user };
    });

    // Автологин после регистрации
    return this.issueTokens(result.user.id, result.user.email, result.user.role, result.operator.id);
  }

  /**
   * Логин поставщика.
   */
  async login(email: string, password: string) {
    const user = await this.prisma.supplierUser.findUnique({
      where: { email },
      include: { operator: { select: { id: true, isActive: true, isSupplier: true } } },
    });

    if (!user) throw new UnauthorizedException('Неверный email или пароль');
    if (!user.isActive) throw new UnauthorizedException('Аккаунт деактивирован');
    if (!user.operator.isActive || !user.operator.isSupplier) {
      throw new UnauthorizedException('Аккаунт поставщика неактивен');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Неверный email или пароль');

    return this.issueTokens(user.id, user.email, user.role, user.operatorId);
  }

  /**
   * Refresh token.
   */
  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify<SupplierJwtPayload>(refreshToken);
      if (payload.type !== 'supplier') throw new UnauthorizedException('Невалидный тип токена');

      const user = await this.prisma.supplierUser.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          refreshTokenHash: true,
          operatorId: true,
        },
      });

      if (!user || !user.isActive) throw new UnauthorizedException('Аккаунт недоступен');

      const tokenHash = this.hashToken(refreshToken);
      if (user.refreshTokenHash !== tokenHash) {
        throw new UnauthorizedException('Refresh token инвалидирован');
      }

      return this.issueTokens(user.id, user.email, user.role, user.operatorId);
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException('Невалидный refresh token');
    }
  }

  async logout(userId: string) {
    await this.prisma.supplierUser.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }

  async getProfile(userId: string) {
    return this.prisma.supplierUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        lastLoginAt: true,
        createdAt: true,
        operator: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            website: true,
            trustLevel: true,
            commissionRate: true,
            promoRate: true,
            promoUntil: true,
            companyName: true,
            inn: true,
            contactEmail: true,
            contactPhone: true,
            verifiedAt: true,
            successfulSales: true,
          },
        },
      },
    });
  }

  private async issueTokens(userId: string, email: string, role: SupplierRole, operatorId: string) {
    const payload: SupplierJwtPayload = {
      sub: userId,
      email,
      role,
      operatorId,
      type: 'supplier',
    };

    const accessToken = this.jwt.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwt.sign(payload, { expiresIn: '30d' });

    const refreshTokenHash = this.hashToken(refreshToken);
    await this.prisma.supplierUser.update({
      where: { id: userId },
      data: { lastLoginAt: new Date(), refreshTokenHash },
    });

    return { accessToken, refreshToken, operatorId };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
