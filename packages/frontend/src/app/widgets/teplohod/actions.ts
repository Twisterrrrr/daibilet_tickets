'use server';

export async function createTeplohodCheckout(input: {
  eventId: string;
  sessionId: string;
  qty?: number;
  returnUrl?: string;
}) {
  const res = await fetch('/api/v1/widgets/teplohod/checkout', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventId: input.eventId,
      sessionId: input.sessionId,
      qty: input.qty ?? 1,
      returnUrl: input.returnUrl ?? null,
    }),
  });

  if (!res.ok) {
    throw new Error(`Checkout error (${res.status})`);
  }

  const json = (await res.json()) as { checkoutUrl: string };
  if (!json.checkoutUrl) {
    throw new Error('checkoutUrl is missing');
  }

  return json.checkoutUrl;
}

