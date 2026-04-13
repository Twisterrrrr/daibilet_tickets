import { describe, expect, it } from 'vitest';

import { pickTicketscloudPrimaryCode } from '../ticketscloud-keyword-classifier';

describe('pickTicketscloudPrimaryCode (Ticketscloud keyword matrix)', () => {
  it('detects standup by keywords', () => {
    const code = pickTicketscloudPrimaryCode({
      title: 'Open mic standup',
      description: 'Комик и стендап',
      organizer: 'Comedy club',
    });
    expect(code).toBe('STANDUP');
  });

  it('prefers river market phrasing vs generic boat tour', () => {
    const code = pickTicketscloudPrimaryCode({
      title: 'Прогулка по каналам на теплоходе',
      description: 'Речная прогулка по реке',
      organizer: null,
    });
    expect(code).toBe('RIVER');
  });

  it('detects museum visit formats', () => {
    const code = pickTicketscloudPrimaryCode({
      title: 'Посещение галереи современного искусства',
      description: 'Gallery visit',
      organizer: null,
    });
    expect(code).toBe('GALLERY');
  });
});

