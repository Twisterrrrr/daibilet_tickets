import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { PrismaModule } from '../prisma/prisma.module';
import { UserJwtGuard } from './user.guard';
import { UserAuthController } from './user-auth.controller';
import { UserAuthService } from './user-auth.service';
import { UserFavoritesController } from './user-favorites.controller';
import { UserFavoritesService } from './user-favorites.service';
import { UserJwtStrategy } from './user-jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [UserJwtStrategy, UserAuthService, UserFavoritesService, UserJwtGuard],
  controllers: [UserAuthController, UserFavoritesController],
  exports: [UserAuthService, UserFavoritesService],
})
export class UserModule {}
