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

export async function invalidate(body) {
  return request('/admin/cache/invalidate', { method: 'POST', json: body });
}

