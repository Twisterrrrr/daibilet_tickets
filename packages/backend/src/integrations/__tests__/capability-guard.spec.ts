import { ProviderAccountAuthType, ProviderOperationalClass, ProviderProtocolType, TicketProviderCode } from '@/prisma-client';
import { describe, expect, it } from 'vitest';

import { assertCapability } from '../contracts/capability-guard';
import { emptyCapabilities } from '../contracts/provider-capabilities';
import type { ProviderDescriptor } from '../contracts/provider-descriptor';
import { ProviderCapabilityDeniedError } from '../contracts/provider-errors';

describe('assertCapability', () => {
  const desc: ProviderDescriptor = {
    code: TicketProviderCode.MANUAL,
    protocolType: ProviderProtocolType.CUSTOM,
    operationalClass: ProviderOperationalClass.CUSTOM_PARTNER,
    authType: ProviderAccountAuthType.NONE,
    capabilities: emptyCapabilities(),
  };

  it('throws ProviderCapabilityDeniedError when flag is false', () => {
    expect(() => assertCapability(desc, 'supportsPullEvents')).toThrow(ProviderCapabilityDeniedError);
  });

  it('passes when flag is true', () => {
    const d: ProviderDescriptor = {
      ...desc,
      capabilities: { ...emptyCapabilities(), supportsPullEvents: true },
    };
    expect(() => assertCapability(d, 'supportsPullEvents')).not.toThrow();
  });
});
