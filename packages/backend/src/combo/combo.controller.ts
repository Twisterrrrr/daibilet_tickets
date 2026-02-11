import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ComboService } from './combo.service';

@ApiTags('combo')
@Controller('combos')
export class ComboController {
  constructor(private readonly comboService: ComboService) {}

  @Get()
  @ApiOperation({ summary: 'Список combo-программ (готовые маршруты)' })
  getAll(@Query('city') city?: string) {
    return this.comboService.getAll(city);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Детальная combo-страница с живыми данными событий' })
  getBySlug(@Param('slug') slug: string) {
    return this.comboService.getBySlug(slug);
  }

  @Post(':slug/populate')
  @ApiOperation({ summary: 'Принудительно пересобрать curatedEvents для combo' })
  populate(@Param('slug') slug: string) {
    return this.comboService.populate(slug);
  }

  @Post('populate-all')
  @ApiOperation({ summary: 'Пересобрать curatedEvents для всех combo' })
  populateAll() {
    return this.comboService.populateAll();
  }
}
