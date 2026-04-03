import { TicketProviderCode } from '@prisma/client';

import { ProviderInvalidCodeError } from '../contracts/provider-errors';

const CODES = new Set<string>(Object.values(TicketProviderCode));

/** Парсинг :provider из URL (case-sensitive, как в Prisma enum). */
export function parseTicketProviderCodeParam(raw: string): TicketProviderCode {
  const v = raw?.trim();
  if (!v || !CODES.has(v)) {
    throw new ProviderInvalidCodeError(raw ?? '');
  }
  return v as TicketProviderCode;
}
