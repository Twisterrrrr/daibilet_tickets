import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { BlogService } from './blog.service';

@ApiTags('articles')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  @ApiOperation({ summary: 'Список статей' })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'tag', required: false })
  @ApiQuery({ name: 'page', required: false })
  getArticles(@Query('city') city?: string, @Query('tag') tag?: string, @Query('page') page?: string) {
    return this.blogService.getArticles({
      city,
      tag,
      page: page ? parseInt(page, 10) : 1,
    });
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Статья по slug' })
  getArticle(@Param('slug') slug: string) {
    return this.blogService.getArticleBySlug(slug);
  }
}

