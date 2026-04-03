import type { ProviderDescriptor } from './provider-descriptor';

/**
 * Ticket provider adapter: только optional-методы; перед вызовом — assertCapability(descriptor, …).
 */
export interface ExternalTicketProvider {
  getDescriptor(): ProviderDescriptor;

  pullEvents?(): Promise<unknown>;
  pullSessions?(): Promise<unknown>;
  createExternalOrder?(): Promise<unknown>;
  getExternalOrder?(): Promise<unknown>;
  cancelExternalOrder?(): Promise<unknown>;
  /** Обработка входящего webhook после валидации подписи (TODO ProviderSignatureService). */
  handleWebhook?(payload: unknown, context: { headers: Record<string, string | string[] | undefined> }): Promise<unknown>;
}
