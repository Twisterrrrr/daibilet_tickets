import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { assertRoutePointXor } from '../route-point.validation';

describe('route-point.validation', () => {
  it('requires exactly one of venueId/eventId', () => {
    expect(() => assertRoutePointXor({ venueId: null, eventId: null })).toThrow(BadRequestException);
    expect(() => assertRoutePointXor({ venueId: 'a', eventId: 'b' })).toThrow(BadRequestException);
    expect(() => assertRoutePointXor({ venueId: 'a', eventId: null })).not.toThrow();
    expect(() => assertRoutePointXor({ venueId: null, eventId: 'b' })).not.toThrow();
  });
});
