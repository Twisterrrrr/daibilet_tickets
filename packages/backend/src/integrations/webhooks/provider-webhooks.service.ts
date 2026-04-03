import { Injectable, Logger } from '@nestjs/common';
import type { TicketProviderCode } from '@prisma/client';

import { assertCapability } from '../contracts/capability-guard';
import { ProviderExternalPersistenceService } from '../provider-external-persistence.service';
import { ProviderRegistryService } from '../routing/provider-registry.service';
import { ProviderSignatureService } from '../provider-signature.service';

export type InboundWebhookOutcome =
  | { kind: 'NO_OP' }
  | { kind: 'OK'; data?: unknown }
  | { kind: 'ERROR'; message: string };

@Injectable()
export class ProviderWebhooksService {
  private readonly logger = new Logger(ProviderWebhooksService.name);

  constructor(
    private readonly registry: ProviderRegistryService,
    private readonly persistence: ProviderExternalPersistenceService,
    private readonly signatures: ProviderSignatureService,
  ) {}

  async ingest(
    code: TicketProviderCode,
    payload: unknown,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<InboundWebhookOutcome> {
    this.signatures.verifyOrWarn(code);

    const log = await this.persistence.createWebhookLog({
      provider: code,
      payload: payload as object,
      headersJson: headers as object,
    });

    const adapter = this.registry.get(code);
    const descriptor = adapter.getDescriptor();

    if (!descriptor.capabilities.supportsWebhooks) {
      await this.persistence.markWebhookNoOp(
        log.id,
        'Webhook not supported for this ticket provider (foundation no-op)',
      );
      return { kind: 'NO_OP' };
    }

    assertCapability(descriptor, 'supportsWebhooks');
    if (!adapter.handleWebhook) {
      const msg = `handleWebhook not implemented for ${code}`;
      this.logger.warn(msg);
      await this.persistence.markWebhookError(log.id, msg);
      return { kind: 'ERROR', message: msg };
    }

    try {
      const data = await adapter.handleWebhook(payload, { headers });
      await this.persistence.markWebhookProcessed(log.id);
      return { kind: 'OK', data };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.persistence.markWebhookError(log.id, message);
      return { kind: 'ERROR', message };
    }
  }
}
