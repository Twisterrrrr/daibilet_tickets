import { Injectable } from '@nestjs/common';

import { EventQualityService } from './event-quality.service';

export type PublishGateCheckCode =
  | 'LOCATION_VALID'
  | 'VENUE_VALID'
  | 'HAS_OFFERS'
  | 'HAS_FUTURE_SESSIONS'
  | 'HAS_PRICE'
  | 'CATEGORY_VALID'
  | 'MEDIA_VALID';

export type PublishGateCheck = {
  code: PublishGateCheckCode;
  status: 'OK' | 'BLOCKING' | 'WARNING';
  message: string;
};

export type PublishGateResult = {
  checks: PublishGateCheck[];
  result: 'OK' | 'WARNING' | 'BLOCKING';
};

@Injectable()
export class PublishGateService {
  constructor(private readonly eventQuality: EventQualityService) {}

  async validateEventForPublish(eventId: string): Promise<PublishGateResult> {
    const quality = await this.eventQuality.validateForPublish(eventId);
    const issueCodes = new Set(quality.issues.map((issue) => issue.code));
    const checks: PublishGateCheck[] = [
      this.fromIssues('LOCATION_VALID', issueCodes, ['MISSING_LOCATION'], 'Проверка локации'),
      this.fromIssues('VENUE_VALID', issueCodes, ['INVALID_VENUE'], 'Проверка площадки'),
      this.fromIssues('HAS_OFFERS', issueCodes, ['MISSING_ACTIVE_OFFER'], 'Наличие офферов'),
      this.fromIssues('HAS_FUTURE_SESSIONS', issueCodes, ['NO_FUTURE_SESSIONS'], 'Наличие будущих сеансов'),
      this.fromIssues('HAS_PRICE', issueCodes, ['NO_VALID_PRICE'], 'Наличие валидной цены'),
      this.fromIssues('CATEGORY_VALID', issueCodes, ['MISSING_CATEGORY'], 'Проверка категории'),
      this.fromIssues('MEDIA_VALID', issueCodes, ['MISSING_IMAGE'], 'Проверка медиа'),
    ];

    const hasBlocking = checks.some((check) => check.status === 'BLOCKING');
    const hasWarning = checks.some((check) => check.status === 'WARNING');
    return { checks, result: hasBlocking ? 'BLOCKING' : hasWarning ? 'WARNING' : 'OK' };
  }

  private fromIssues(
    code: PublishGateCheckCode,
    issues: Set<string>,
    blockers: string[],
    message: string,
  ): PublishGateCheck {
    return { code, status: blockers.some((blocker) => issues.has(blocker)) ? 'BLOCKING' : 'OK', message };
  }
}
