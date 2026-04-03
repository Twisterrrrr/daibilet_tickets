/**
 * Capability flags for ticket providers (v0.1 matrix).
 * Все решения оркестрации — через descriptor.capabilities + assertCapability.
 */
export interface ProviderCapabilities {
  supportsPullEvents: boolean;
  supportsPullSessions: boolean;
  supportsSeats: boolean;
  supportsAvailability: boolean;
  supportsCreateOrder: boolean;
  supportsGetOrderStatus: boolean;
  supportsCancelOrder: boolean;
  supportsRefunds: boolean;
  supportsWebhooks: boolean;
  supportsPdfTickets: boolean;
  supportsQrOrBarcode: boolean;
  supportsReserveBeforePayment: boolean;
  supportsMultiAccount: boolean;
  requiresManualApproval: boolean;
  requiresClientCertificate: boolean;
  supportsSoapXml: boolean;
  supportsHostedPaymentPage: boolean;
  supportsEmbeddedCheckout: boolean;
}

/** Все флаги false — база для scaffold-провайдеров. */
export function emptyCapabilities(): ProviderCapabilities {
  return {
    supportsPullEvents: false,
    supportsPullSessions: false,
    supportsSeats: false,
    supportsAvailability: false,
    supportsCreateOrder: false,
    supportsGetOrderStatus: false,
    supportsCancelOrder: false,
    supportsRefunds: false,
    supportsWebhooks: false,
    supportsPdfTickets: false,
    supportsQrOrBarcode: false,
    supportsReserveBeforePayment: false,
    supportsMultiAccount: false,
    requiresManualApproval: false,
    requiresClientCertificate: false,
    supportsSoapXml: false,
    supportsHostedPaymentPage: false,
    supportsEmbeddedCheckout: false,
  };
}
