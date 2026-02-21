import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { UserJwtStrategy } from './user-jwt.strategy';
import { UserAuthService } from './user-auth.service';
import { UserAuthController } from './user-auth.controller';
import { UserFavoritesService } from './user-favorites.service';
import { UserFavoritesController } from './user-favorites.controller';
import { UserJwtGuard } from './user.guard';

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
