function getBaseUrl() {
  return (window.__ENV__ && window.__ENV__.ADMIN_API_BASE_URL) || 'http://localhost:4000';
}

async function request(path, { method = 'GET', json } = {}) {
  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: json ? JSON.stringify(json) : undefined,
  });

  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      msg = body?.message || body?.error || msg;
    } catch {}
    throw new Error(msg);
  }

  if (res.status === 204) return null;
  return await res.json();
}

export async function searchOrders(params) {
  const qs = new URLSearchParams();
  qs.set('query', params.query);
  if (params.status) qs.set('status', params.status);
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.cursor) qs.set('cursor', params.cursor);
  return request(`/admin/orders/search?${qs.toString()}`);
}

export async function resend(orderId, { to, reason, idempotencyKey } = {}) {
  return request(`/admin/orders/${orderId}/resend`, {
    method: 'POST',
    json: { channel: 'EMAIL', to, reason, idempotencyKey },
  });
}

export async function retryFulfilment(orderId, { reason, idempotencyKey } = {}) {
  return request(`/admin/orders/${orderId}/retry-fulfilment-ops`, {
    method: 'POST',
    json: { mode: 'SAFE', reason, idempotencyKey },
  });
}

