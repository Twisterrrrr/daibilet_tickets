import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { CatalogService } from '../catalog/catalog.service';
import { PrismaService } from '../prisma/prisma.service';
import { PreviewService } from '../preview/preview.service';

@ApiTags('admin-previews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/previews')
export class AdminPreviewsController {
  constructor(
    private readonly preview: PreviewService,
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly config: ConfigService,
  ) {}

  @Post('events/:id')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Создать preview URL для события' })
  async createEventPreview(@Param('id') id: string) {
    // Убедимся, что событие существует (включая черновики / скрытые).
    await this.prisma.event.findUniqueOrThrow({
      where: { id },
      select: { id: true },
    });

    const token = this.preview.signPreviewToken('EVENT', id);
    const appUrl =
      this.config.get<string>('APP_URL') ||
      (process.env.NODE_ENV === 'production' ? 'https://daibilet.ru' : 'http://localhost:3000');
    const previewPath = `/preview/events/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`;

    return { previewUrl: `${appUrl}${previewPath}` };
  }

  @Post('venues/:id')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Создать preview URL для площадки (venue)' })
  async createVenuePreview(@Param('id') id: string) {
    // Убедимся, что venue существует (включая неактивные).
    await this.prisma.venue.findUniqueOrThrow({
      where: { id },
      select: { id: true },
    });

    const token = this.preview.signPreviewToken('VENUE', id);
    const appUrl =
      this.config.get<string>('APP_URL') ||
      (process.env.NODE_ENV === 'production' ? 'https://daibilet.ru' : 'http://localhost:3000');
    const previewPath = `/preview/venues/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`;

    return { previewUrl: `${appUrl}${previewPath}` };
  }
}

