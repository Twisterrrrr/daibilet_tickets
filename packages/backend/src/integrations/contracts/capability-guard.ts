import type { TicketProviderCode } from '@prisma/client';

import type { ProviderCapabilities } from './provider-capabilities';
import type { ProviderDescriptor } from './provider-descriptor';
import { ProviderCapabilityDeniedError } from './provider-errors';

export function assertCapability(
  descriptor: ProviderDescriptor,
  key: keyof ProviderCapabilities,
): void {
  if (!descriptor.capabilities[key]) {
    throw new ProviderCapabilityDeniedError(descriptor.code as TicketProviderCode, key);
  }
}
