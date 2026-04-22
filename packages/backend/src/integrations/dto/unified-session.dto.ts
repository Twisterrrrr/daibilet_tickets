export interface UnifiedSessionDto {
  externalSessionId: string;
  startsAt?: string;
  metadata?: Record<string, unknown>;
}
