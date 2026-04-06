import { Module } from '@nestjs/common';

import { CatalogModule } from '../catalog/catalog.module';
import { UserModule } from '../user/user.module';
import { SupplierModule } from '../supplier/supplier.module';
import { SupplierLedgerService } from '../ledger/supplier-ledger.service';
import { MailModule } from '../mail/mail.module';
import { PricingModule } from '../pricing/pricing.module';
import { BOOKING_PROVIDER_TOKEN, BookingProviderRegistry } from './booking-provider.interface';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { FeatureFlagService } from './feature-flag.service';
import { FulfillmentService } from './fulfillment.service';
import { PaymentEventLogService } from './payment-event-log.service';
import { PaymentService } from './payment.service';
import { InternalBookingProvider } from './providers/internal-booking.provider';
import { PartnerBookingProvider } from './providers/partner-booking.provider';
import { TcBookingProvider } from './providers/tc-booking.provider';
import { FulfillmentRefundRequestService } from './fulfillment-refund-request.service';
import { RefundService } from './refund.service';
import { WebhookIdempotencyService } from './webhook-idempotency.service';

@Module({
  imports: [CatalogModule, MailModule, PricingModule, UserModule, SupplierModule],
  controllers: [CheckoutController],
  providers: [
    CheckoutService,
    SupplierLedgerService,
    PaymentService,
    FulfillmentService,
    RefundService,
    FulfillmentRefundRequestService,
    WebhookIdempotencyService,
    PaymentEventLogService,
    FeatureFlagService,
    // Booking providers (adapters)
    TcBookingProvider,
    InternalBookingProvider,
    PartnerBookingProvider,
    // Provider registry: Map<string, BookingProvider>
    {
      provide: BOOKING_PROVIDER_TOKEN,
      useFactory: (
        tc: TcBookingProvider,
        internal: InternalBookingProvider,
        partner: PartnerBookingProvider,
      ): BookingProviderRegistry => {
        const registry: BookingProviderRegistry = new Map();
        registry.set('TC', tc);
        registry.set('TEP', tc); // TEP uses same TC adapter for now
        registry.set('INTERNAL', internal);
        registry.set('PARTNER', partner);
        return registry;
      },
      inject: [TcBookingProvider, InternalBookingProvider, PartnerBookingProvider],
    },
  ],
  exports: [
    CheckoutService,
    PaymentService,
    FulfillmentService,
    RefundService,
    FulfillmentRefundRequestService,
    WebhookIdempotencyService,
    FeatureFlagService,
  ],
})
export class CheckoutModule {}
