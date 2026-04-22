import { Injectable } from '@nestjs/common';

import { ProviderIntegrationNotConfiguredError } from '../../errors/provider-integration.errors';
import { joinTicketProviderUrl, ticketProviderJsonFetch } from '../../http/ticket-provider-json-fetch';
import { QticketsIntegrationEnv } from './qtickets-integration.env';

const LABEL = 'QTICKETS';

@Injectable()
export class QticketsHttpService {
  constructor(private readonly env: QticketsIntegrationEnv) {}

  assertReady(): void {
    if (!this.env.isReady()) {
      throw new ProviderIntegrationNotConfiguredError(LABEL);
    }
  }

  isReady(): boolean {
    return this.env.isReady();
  }

  private authHeaders(): Record<string, string> {
    const name = this.env.getApiKeyHeaderName();
    return { [name]: this.env.getApiKey()! };
  }

  async getJson<T = unknown>(path: string): Promise<T> {
    this.assertReady();
    const url = joinTicketProviderUrl(this.env.getBaseUrl()!, path);
    return ticketProviderJsonFetch<T>({
      url,
      method: 'GET',
      headers: this.authHeaders(),
      providerLabel: LABEL,
    });
  }

  async postJson<T = unknown>(path: string, body: unknown): Promise<T> {
    this.assertReady();
    const url = joinTicketProviderUrl(this.env.getBaseUrl()!, path);
    return ticketProviderJsonFetch<T>({
      url,
      method: 'POST',
      headers: this.authHeaders(),
      body,
      providerLabel: LABEL,
    });
  }
}
