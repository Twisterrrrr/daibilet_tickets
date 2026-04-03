import { BadRequestException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import type { TicketProviderCode } from '@prisma/client';

import type { ProviderCapabilities } from './provider-capabilities';

/** Провайдер не зарегистрирован в реестре (после routing). */
export class ProviderNotRegisteredError extends NotFoundException {
  constructor(code: TicketProviderCode) {
    super({ message: `Ticket provider not registered: ${code}`, code });
  }
}

/** Не удалось сопоставить событие с провайдером. */
export class ProviderRouteNotFoundError extends NotFoundException {
  constructor(eventId: string, detail?: string) {
    super({
      message: 'Cannot resolve ticket provider for event',
      eventId,
      detail,
    });
  }
}

/** Capability выключен — не вызывать метод провайдера. */
export class ProviderCapabilityDeniedError extends HttpException {
  constructor(code: TicketProviderCode, capability: keyof ProviderCapabilities) {
    super(
      {
        message: `Ticket provider ${code} does not support ${String(capability)}`,
        code,
        capability: String(capability),
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

/** Метод не реализован на этапе foundation (ожидается следующая волна). */
export class ProviderMethodNotImplementedError extends HttpException {
  constructor(code: TicketProviderCode, method: string) {
    super(
      {
        message: `Ticket provider ${code}: ${method} not implemented (foundation stage)`,
        code,
        method,
      },
      HttpStatus.NOT_IMPLEMENTED,
    );
  }
}

/** Некорректный код провайдера в URL (webhook и т.д.). */
export class ProviderInvalidCodeError extends BadRequestException {
  constructor(raw: string) {
    super({ message: `Invalid ticket provider code: ${raw}` });
  }
}
