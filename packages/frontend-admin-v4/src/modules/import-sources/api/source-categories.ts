import { api } from '@/shared/api/client';
import type { SourceCategoryMappingDto, SourceCategoryUnknownDto } from '@/modules/import-sources/types';

export async function listSourceCategoryMappings() {
  return api<SourceCategoryMappingDto[]>('/admin/source-categories');
}

export async function listUnknownSourceCategories() {
  return api<SourceCategoryUnknownDto[]>('/admin/source-categories/unknowns');
}

