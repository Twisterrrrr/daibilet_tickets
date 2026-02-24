import { Injectable } from '@nestjs/common';
import type { SeoEntityType } from './seo.types';
import type { UpsertSeoMetaDto } from './dto/upsert-seo-meta.dto';

@Injectable()
export class SeoService {
  async getSeoMeta(entityType: SeoEntityType, entityId: string): Promise<Record<string, unknown> | null> {
    return null;
  }

  async upsertSeoMeta(entityType: SeoEntityType, entityId: string, data: UpsertSeoMetaDto): Promise<Record<string, unknown>> {
    return data as unknown as Record<string, unknown>;
  }

  async generateSeoMeta(entityType: SeoEntityType, entityId: string): Promise<Record<string, unknown> | null> {
    return null;
  }
}
