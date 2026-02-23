import { Injectable } from '@nestjs/common';
import type { SeoEntityType } from './seo.types';

@Injectable()
export class SeoGeneratorService {
  async generate(entityType: SeoEntityType, entityId: string): Promise<{ title: string; description: string } | null> {
    return null;
  }
}
