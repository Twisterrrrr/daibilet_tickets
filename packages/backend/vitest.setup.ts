import { Logger } from '@nestjs/common';

/**
 * Vitest helper: глушит NestJS Logger шум во время unit/e2e прогонов.
 * Это не влияет на бизнес-логику и не меняет API/контракты.
 */
// eslint rule `no-empty-function` ругается на полностью пустое тело,
// поэтому возвращаем `undefined` (выражение) вместо пустой функции.
const noop = () => undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Logger.prototype as any).log = noop;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Logger.prototype as any).debug = noop;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Logger.prototype as any).warn = noop;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Logger.prototype as any).error = noop;

