import { BadRequestException } from '@nestjs/common';

export function assertRoutePointXor(args: { venueId?: string | null; eventId?: string | null }): void {
  const v = args.venueId ?? null;
  const e = args.eventId ?? null;
  const filled = (v ? 1 : 0) + (e ? 1 : 0);
  if (filled !== 1) {
    throw new BadRequestException('Ровно одно из venueId/eventId должно быть заполнено');
  }
}
