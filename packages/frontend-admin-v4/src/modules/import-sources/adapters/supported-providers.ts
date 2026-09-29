import type { SupplierIntegrationDto } from '@/modules/import-sources/types';

export type SupportedProvider = 'ticketscloud' | 'teplohod';

export function detectProviderFromAdapterCode(adapterCode: string): SupportedProvider | null {
  const c = (adapterCode ?? '').toLowerCase();
  if (c.includes('teplohod')) return 'teplohod';
  if (c.includes('ticketscloud') || c.includes('tc')) return 'ticketscloud';
  return null;
}

export function filterSupportedIntegrations(items: SupplierIntegrationDto[]) {
  const supported: SupplierIntegrationDto[] = [];
  const unsupported: SupplierIntegrationDto[] = [];
  for (const it of items) {
    if (detectProviderFromAdapterCode(it.adapterCode)) supported.push(it);
    else unsupported.push(it);
  }
  return { supported, unsupported };
}

