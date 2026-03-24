import { Module } from '@nestjs/common';

import { CatalogModule } from '../catalog/catalog.module';
import { CollectionController } from './collection.controller';
import { CollectionMaterializerService } from './collection-materializer.service';
import { CollectionSuggestionService } from './collection-suggestion.service';
import { CatalogCollectionsController } from './catalog-collections.controller';
import { CollectionService } from './collection.service';

@Module({
  imports: [CatalogModule],
  controllers: [CollectionController, CatalogCollectionsController],
  providers: [CollectionService, CollectionSuggestionService, CollectionMaterializerService],
  exports: [CollectionService, CollectionSuggestionService, CollectionMaterializerService],
})
export class CollectionModule {}
