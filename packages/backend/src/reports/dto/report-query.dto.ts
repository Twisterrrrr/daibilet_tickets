import { EventCategory, EventSource } from '@/prisma-client';

export class ReportQueryDto {
  from?: string;
  to?: string;

  cityId?: string;
  operatorId?: string;
  source?: EventSource;
  category?: EventCategory;
}

