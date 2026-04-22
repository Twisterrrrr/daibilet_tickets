/** Унифицированный снимок события (extension point; не навязывает REST SOAP-провайдерам на транспорте). */
export interface UnifiedEventDto {
  externalEventId: string;
  title?: string;
  metadata?: Record<string, unknown>;
}
