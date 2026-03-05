import { Injectable } from '@nestjs/common';
import type { SeoEntityType } from './seo.types';
import type { UpsertSeoMetaDto } from './dto/upsert-seo-meta.dto';

@Injectable()
export class SeoService {
  async getSeoMeta(_entityType: SeoEntityType, _entityId: string): Promise<Record<string, unknown> | null> {
    return null;
  }

  async upsertSeoMeta(_entityType: SeoEntityType, _entityId: string, data: UpsertSeoMetaDto): Promise<Record<string, unknown>> {
    return data as unknown as Record<string, unknown>;
  }

  async generateSeoMeta(_entityType: SeoEntityType, _entityId: string): Promise<Record<string, unknown> | null> {
    return null;
  }
}
