export type TicketArtifactType =
  | 'INTERNAL_TICKET'
  | 'EXTERNAL_VOUCHER'
  | 'BOOKING_CONFIRMATION';

export interface TicketArtifact {
  type: TicketArtifactType;
  url: string;
  title: string;
  source: 'PLATFORM' | 'EXTERNAL';
  lineItemIndex?: number | null;
}

export interface TicketCapabilityResult {
  hasArtifact: boolean;
  primaryArtifact: TicketArtifact | null;
  allArtifacts: TicketArtifact[];
  canOpenInternalTrack: boolean;
  canOpenExternalVoucher: boolean;
}

