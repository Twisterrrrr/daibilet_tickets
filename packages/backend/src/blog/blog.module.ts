import { Module } from '@nestjs/common';

import { ArticlesController } from './articles.controller';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';

@Module({
  controllers: [BlogController, ArticlesController],
  providers: [BlogService],
  exports: [BlogService],
})
export class BlogModule {}
