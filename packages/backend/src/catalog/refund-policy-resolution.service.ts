/**
 * Резолв политики возврата/обмена по цепочке наследования.
 * @see docs/PageTemplateSpecs.md §6
 */

import { Injectable } from '@nestjs/common';
import type { VenueRefundPolicyMode, EventRefundPolicyMode } from '@prisma/client';

const DEFAULT_REFUND_POLICY_TEXT =
  'Условия возврата и обмена билетов зависят от правил конкретного организатора. ' +
  'Подробности уточняйте при покупке или обращайтесь в службу поддержки.';

export interface SupplierRefundContext {
  defaultRefundPolicyText: string | null;
}

export interface VenueRefundContext {
  refundPolicyMode: VenueRefundPolicyMode | null;
  refundPolicyText: string | null;
}

export interface EventRefundContext {
  refundPolicyMode: EventRefundPolicyMode | null;
  refundPolicyText: string | null;
}

@Injectable()
export class RefundPolicyResolutionService {
  /**
   * Резолв политики возврата для Venue.
   * Venue: CUSTOM → свой текст; INHERIT_SUPPLIER → supplier; fallback → system default.
   */
  resolveVenueRefundPolicy(venue: VenueRefundContext, supplier: SupplierRefundContext): string {
    if (venue.refundPolicyMode === 'CUSTOM' && venue.refundPolicyText?.trim()) {
      return venue.refundPolicyText.trim();
    }
    if (venue.refundPolicyMode === 'INHERIT_SUPPLIER' && supplier.defaultRefundPolicyText?.trim()) {
      return supplier.defaultRefundPolicyText.trim();
    }
    return DEFAULT_REFUND_POLICY_TEXT;
  }

  /**
   * Резолв политики возврата для Event.
   * Event: CUSTOM → свой текст; INHERIT_VENUE → venue; INHERIT_SUPPLIER → supplier; fallback → system default.
   */
  resolveEventRefundPolicy(
    event: EventRefundContext,
    venue: VenueRefundContext | null,
    supplier: SupplierRefundContext | null,
  ): string {
    if (event.refundPolicyMode === 'CUSTOM' && event.refundPolicyText?.trim()) {
      return event.refundPolicyText.trim();
    }
    if (event.refundPolicyMode === 'INHERIT_VENUE' && venue) {
      return this.resolveVenueRefundPolicy(venue, supplier ?? { defaultRefundPolicyText: null });
    }
    if (event.refundPolicyMode === 'INHERIT_SUPPLIER' && supplier?.defaultRefundPolicyText?.trim()) {
      return supplier.defaultRefundPolicyText.trim();
    }
    if (venue && supplier) {
      return this.resolveVenueRefundPolicy(venue, supplier);
    }
    if (supplier?.defaultRefundPolicyText?.trim()) {
      return supplier.defaultRefundPolicyText.trim();
    }
    return DEFAULT_REFUND_POLICY_TEXT;
  }
}
