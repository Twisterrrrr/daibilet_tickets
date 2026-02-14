import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { PaymentService } from './payment.service';
import { FulfillmentService } from './fulfillment.service';
import { RefundService } from './refund.service';
import { WebhookIdempotencyService } from './webhook-idempotency.service';
import { FeatureFlagService } from './feature-flag.service';
import { CatalogModule } from '../catalog/catalog.module';
import { BOOKING_PROVIDER_TOKEN, BookingProviderRegistry } from './booking-provider.interface';
import { TcBookingProvider } from './providers/tc-booking.provider';
import { InternalBookingProvider } from './providers/internal-booking.provider';
import { PartnerBookingProvider } from './providers/partner-booking.provider';

@Module({
  imports: [CatalogModule],
  controllers: [CheckoutController],
  providers: [
    CheckoutService,
    PaymentService,
    FulfillmentService,
    RefundService,
    WebhookIdempotencyService,
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
  exports: [PaymentService, FulfillmentService, RefundService, WebhookIdempotencyService, FeatureFlagService],
})
export class CheckoutModule {}
