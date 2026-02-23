import { Injectable } from '@nestjs/common';
import type { SeoEntityType } from './seo.types';

export interface SeoMetaDto {
  title?: string;
  description?: string;
  canonicalUrl?: string;
}

@Injectable()
export class SeoMetaService {
  async getSeoMeta(entityType: SeoEntityType, entityId: string): Promise<SeoMetaDto | null> {
    return null;
  }

  async upsertSeoMeta(
    entityType: SeoEntityType,
    entityId: string,
    data: SeoMetaDto,
  ): Promise<SeoMetaDto> {
    return data;
  }

  async generateSeoMeta(
    entityType: SeoEntityType,
    entityId: string,
  ): Promise<SeoMetaDto | null> {
    return null;
  }
}
