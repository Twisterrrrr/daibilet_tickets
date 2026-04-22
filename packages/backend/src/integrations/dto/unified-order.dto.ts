export interface UnifiedOrderDto {
  externalOrderId: string;
  status?: string;
  metadata?: Record<string, unknown>;
}
