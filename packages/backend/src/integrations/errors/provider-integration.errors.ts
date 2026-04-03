import { HttpException, HttpStatus } from '@nestjs/common';

/** Нет BASE_URL / токена — live-вызовы запрещены (Wave 1 prep до появления вендора). */
export class ProviderIntegrationNotConfiguredError extends HttpException {
  constructor(providerLabel: string) {
    super(
      {
        message: `Ticket provider "${providerLabel}" is not configured (missing env). See docs/Wave1-Radario-Qtickets-Prep.md`,
        code: 'PROVIDER_NOT_CONFIGURED',
        provider: providerLabel,
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

export class TicketProviderHttpError extends HttpException {
  constructor(
    public readonly providerLabel: string,
    public readonly statusCode: number,
    detail: string,
  ) {
    super(
      {
        message: `Ticket provider HTTP error (${providerLabel}): ${detail}`,
        code: 'TICKET_PROVIDER_HTTP_ERROR',
        provider: providerLabel,
        statusCode,
      },
      HttpStatus.BAD_GATEWAY,
    );
  }
}
