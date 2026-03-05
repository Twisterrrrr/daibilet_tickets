export function getPartnerEventId(event: { source: string; tcEventId?: string | null; id: string }) {
  return event.source === 'TEPLOHOD' && event.tcEventId ? event.tcEventId : event.id;
}

