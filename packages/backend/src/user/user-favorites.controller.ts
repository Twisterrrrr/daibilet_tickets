import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AddFavoriteDto } from './dto/user-favorites.dto';
import { SyncFavoritesDto } from './dto/user-favorites.dto';
import { UserJwtGuard } from './user.guard';
import { UserFavoritesService } from './user-favorites.service';

interface RequestWithUser {
  user: { id: string };
}

@ApiTags('user')
@Controller('user/favorites')
@UseGuards(UserJwtGuard)
@ApiBearerAuth()
export class UserFavoritesController {
  constructor(private readonly favorites: UserFavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'Список избранного (slugs)' })
  async list(@Req() req: RequestWithUser) {
    return { slugs: await this.favorites.getSlugs(req.user.id) };
  }

  @Post('sync')
  @ApiOperation({ summary: 'Синхронизировать избранное (merge с localStorage)' })
  async sync(@Body() body: SyncFavoritesDto, @Req() req: RequestWithUser) {
    const slugs = await this.favorites.sync(req.user.id, body.slugs);
    return { slugs };
  }

  @Post()
  @ApiOperation({ summary: 'Добавить в избранное' })
  async add(@Body() body: AddFavoriteDto, @Req() req: RequestWithUser) {
    const slugs = await this.favorites.add(req.user.id, body.slug);
    return { slugs };
  }

  @Delete(':slug')
  @ApiOperation({ summary: 'Удалить из избранного' })
  async remove(@Param('slug') slug: string, @Req() req: RequestWithUser) {
    const slugs = await this.favorites.remove(req.user.id, slug);
    return { slugs };
  }
}
