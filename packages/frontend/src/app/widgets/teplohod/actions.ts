'use server';

import { fetchApi } from '@/lib/api';

export async function createTeplohodCheckout(input: {
  eventId: string;
  sessionId: string;
  qty?: number;
  returnUrl?: string;
}) {
  const json = await fetchApi<{ checkoutUrl: string }>('/widgets/teplohod/checkout', {
    method: 'POST',
    cache: 'no-store',
    body: JSON.stringify({
      eventId: input.eventId,
      sessionId: input.sessionId,
      qty: input.qty ?? 1,
      returnUrl: input.returnUrl ?? null,
    }),
  });

  if (!json.checkoutUrl) {
    throw new Error('checkoutUrl is missing');
  }

  return json.checkoutUrl;
}

