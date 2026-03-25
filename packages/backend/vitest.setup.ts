import { Logger } from '@nestjs/common';

/**
 * Vitest helper: глушит NestJS Logger шум во время unit/e2e прогонов.
 * Это не влияет на бизнес-логику и не меняет API/контракты.
 */
const noop = () => {};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Logger.prototype as any).log = noop;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Logger.prototype as any).debug = noop;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Logger.prototype as any).warn = noop;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Logger.prototype as any).error = noop;

