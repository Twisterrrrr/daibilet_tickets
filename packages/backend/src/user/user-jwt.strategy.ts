import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface UserJwtPayload {
  sub: string;
  email: string;
  type: 'user';
}

@Injectable()
export class UserJwtStrategy extends PassportStrategy(Strategy, 'jwt-user') {
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

  async validate(payload: UserJwtPayload) {
    if (payload.type !== 'user') {
      throw new UnauthorizedException('Невалидный тип токена');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Пользователь не найден или деактивирован');
    }

    return { id: user.id, email: user.email, name: user.name, type: 'user' as const };
  }
}
