import { adminApi } from './client';

export type QualitySeverity = 'BLOCKING' | 'WARNING';
export type QualityTabKey = 'main' | 'location' | 'offers' | 'schedule';

export type EventQualityIssue = {
  code: string;
  message: string;
  field?: string;
  severity: QualitySeverity;
  tabKey: QualityTabKey;
};

export type EventQuality = {
  isSellable: boolean;
  issues: EventQualityIssue[];
};

export async function getEventQuality(eventId: string): Promise<EventQuality> {
  return adminApi.get<EventQuality>(`/admin/events/${eventId}/quality`);
}
*** End Patch ***!
