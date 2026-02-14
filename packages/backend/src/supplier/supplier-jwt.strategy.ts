import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SupplierRole } from '@prisma/client';

export interface SupplierJwtPayload {
  sub: string;         // supplierUser.id
  email: string;
  role: SupplierRole;
  operatorId: string;  // operator/supplier ID
  type: 'supplier';    // отличает от admin JWT
}

@Injectable()
export class SupplierJwtStrategy extends PassportStrategy(Strategy, 'jwt-supplier') {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: SupplierJwtPayload) {
    if (payload.type !== 'supplier') {
      throw new UnauthorizedException('Невалидный тип токена');
    }

    const user = await this.prisma.supplierUser.findUnique({
      where: { id: payload.sub },
      include: {
        operator: {
          select: { id: true, name: true, isActive: true, isSupplier: true, trustLevel: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Пользователь не найден или деактивирован');
    }

    if (!user.operator.isActive || !user.operator.isSupplier) {
      throw new UnauthorizedException('Аккаунт поставщика неактивен');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      operatorId: user.operatorId,
      operatorName: user.operator.name,
      trustLevel: user.operator.trustLevel,
      type: 'supplier' as const,
    };
  }
}
