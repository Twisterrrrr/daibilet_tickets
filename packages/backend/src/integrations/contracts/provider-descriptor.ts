import type {
  ProviderAccountAuthType,
  ProviderOperationalClass,
  ProviderProtocolType,
  TicketProviderCode,
} from '@/prisma-client';

import type { ProviderCapabilities } from './provider-capabilities';

/**
 * First-class дескриптор провайдера. Решения только через эти поля + assertCapability.
 */
export interface ProviderDescriptor {
  code: TicketProviderCode;
  protocolType: ProviderProtocolType;
  operationalClass: ProviderOperationalClass;
  authType: ProviderAccountAuthType;
  capabilities: ProviderCapabilities;
}
