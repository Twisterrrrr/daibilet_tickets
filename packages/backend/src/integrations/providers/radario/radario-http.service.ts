import { Injectable } from '@nestjs/common';

import { ProviderIntegrationNotConfiguredError } from '../../errors/provider-integration.errors';
import { joinTicketProviderUrl, ticketProviderJsonFetch } from '../../http/ticket-provider-json-fetch';
import { RadarioIntegrationEnv } from './radario-integration.env';

const LABEL = 'RADARIO';

/**
 * HTTP-клиент Radario: готов к вызовам, когда заданы env. Пути методов добавляются по спецификации.
 */
@Injectable()
export class RadarioHttpService {
  constructor(private readonly env: RadarioIntegrationEnv) {}

  assertReady(): void {
    if (!this.env.isReady()) {
      throw new ProviderIntegrationNotConfiguredError(LABEL);
    }
  }

  isReady(): boolean {
    return this.env.isReady();
  }

  /** GET JSON относительно RADARIO_BASE_URL. */
  async getJson<T = unknown>(path: string): Promise<T> {
    this.assertReady();
    const url = joinTicketProviderUrl(this.env.getBaseUrl()!, path);
    return ticketProviderJsonFetch<T>({
      url,
      method: 'GET',
      headers: { Authorization: `Bearer ${this.env.getBearerToken()!}` },
      providerLabel: LABEL,
    });
  }

  /** POST JSON. */
  async postJson<T = unknown>(path: string, body: unknown): Promise<T> {
    this.assertReady();
    const url = joinTicketProviderUrl(this.env.getBaseUrl()!, path);
    return ticketProviderJsonFetch<T>({
      url,
      method: 'POST',
      headers: { Authorization: `Bearer ${this.env.getBearerToken()!}` },
      body,
      providerLabel: LABEL,
    });
  }
}
