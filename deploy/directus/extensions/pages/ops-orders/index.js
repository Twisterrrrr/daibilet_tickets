import React, { useMemo, useState } from 'react';
import { searchOrders, resend, retryFulfilment } from './api.js';

function uuid() {
  return (crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random()}`).toString();
}

export default function OpsOrdersPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [cursor, setCursor] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const canSearch = useMemo(() => query.trim().length >= 3, [query]);

  async function onSearch(resetCursor = true) {
    if (!canSearch) return;
    setLoading(true);
    setToast(null);
    try {
      const res = await searchOrders({
        query: query.trim(),
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
        limit: 50,
        cursor: resetCursor ? undefined : cursor || undefined,
      });

      setItems(res.items || []);
      setTotal(res.total ?? null);
      setCursor(res.nextCursor ?? null);
      setToast({
        kind: 'ok',
        text: `Найдено: ${(res.items || []).length}${res.total != null ? ` / всего ${res.total}` : ''}`,
      });
    } catch (e) {
      setToast({ kind: 'err', text: e?.message || 'Ошибка поиска' });
    } finally {
      setLoading(false);
    }
  }

  async function onResend(row) {
    setLoading(true);
    setToast(null);
    try {
      const res = await resend(row.id, {
        to: row.email,
        reason: 'directus_ops',
        idempotencyKey: `directus-resend-${uuid()}`,
      });
      setToast({ kind: 'ok', text: `Resend OK: ${res.actionId}` });
    } catch (e) {
      setToast({ kind: 'err', text: e?.message || 'Ошибка resend' });
    } finally {
      setLoading(false);
    }
  }

  async function onRetry(row) {
    setLoading(true);
    setToast(null);
    try {
      const res = await retryFulfilment(row.id, {
        reason: 'directus_ops',
        idempotencyKey: `directus-retry-${uuid()}`,
      });
      setToast({
        kind: 'ok',
        text: `Retry OK: ${res.actionId}${res.jobId ? ` jobId=${res.jobId}` : ''}`,
      });
    } catch (e) {
      setToast({ kind: 'err', text: e?.message || 'Ошибка retry' });
    } finally {
      setLoading(false);
    }
  }

  function copy(text) {
    if (!text) return;
    navigator.clipboard?.writeText(String(text));
    setToast({ kind: 'ok', text: 'Скопировано в буфер' });
  }

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <h1 style={{ margin: 0 }}>Orders / Ops Tools</h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 180px 180px 180px 120px',
          gap: 8,
          alignItems: 'end',
        }}
      >
        <label style={{ display: 'grid', gap: 4 }}>
          <span>Поиск (id/code/email/phone/paymentId)</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="мин. 3 символа"
            style={{ padding: 8 }}
          />
        </label>

        <label style={{ display: 'grid', gap: 4 }}>
          <span>Status</span>
          <input
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            placeholder="например PAID"
            style={{ padding: 8 }}
          />
        </label>

        <label style={{ display: 'grid', gap: 4 }}>
          <span>From (ISO)</span>
          <input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="2026-02-01"
            style={{ padding: 8 }}
          />
        </label>

        <label style={{ display: 'grid', gap: 4 }}>
          <span>To (ISO)</span>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="2026-02-24"
            style={{ padding: 8 }}
          />
        </label>

        <button onClick={() => onSearch(true)} disabled={!canSearch || loading} style={{ padding: 10 }}>
          {loading ? '...' : 'Найти'}
        </button>
      </div>

      {toast && (
        <div
          style={{
            padding: 10,
            border: '1px solid #ddd',
            background: toast.kind === 'ok' ? '#f3fff4' : '#fff3f3',
          }}
        >
          {toast.text}
        </div>
      )}

      <div style={{ overflowX: 'auto', border: '1px solid #eee' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Order', 'Status', 'Created', 'Email', 'Phone', 'Amount', 'Payment', 'Fulfilment', 'Actions'].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: 8,
                      borderBottom: '1px solid #eee',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id}>
                <td
                  style={{
                    padding: 8,
                    borderBottom: '1px solid #f2f2f2',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ cursor: 'pointer' }} onClick={() => copy(row.id)} title="Click to copy">
                    {row.id}
                  </span>
                </td>
                <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>{row.status}</td>
                <td
                  style={{
                    padding: 8,
                    borderBottom: '1px solid #f2f2f2',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.createdAt ? new Date(row.createdAt).toLocaleString() : '-'}
                </td>
                <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>
                  <span
                    style={{ cursor: row.email ? 'pointer' : 'default' }}
                    onClick={() => copy(row.email)}
                  >
                    {row.email ?? '-'}
                  </span>
                </td>
                <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>
                  <span
                    style={{ cursor: row.phone ? 'pointer' : 'default' }}
                    onClick={() => copy(row.phone)}
                  >
                    {row.phone ?? '-'}
                  </span>
                </td>
                <td
                  style={{
                    padding: 8,
                    borderBottom: '1px solid #f2f2f2',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.totalAmount} {row.currency}
                </td>
                <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>
                  <span
                    style={{ cursor: row.paymentId ? 'pointer' : 'default' }}
                    onClick={() => copy(row.paymentId)}
                  >
                    {row.paymentId ?? '-'}
                  </span>
                </td>
                <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>{row.fulfilmentStatus ?? '-'}</td>
                <td
                  style={{
                    padding: 8,
                    borderBottom: '1px solid #f2f2f2',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    gap: 8,
                  }}
                >
                  <button disabled={loading} onClick={() => onResend(row)} style={{ padding: '6px 10px' }}>
                    Resend
                  </button>
                  <button disabled={loading} onClick={() => onRetry(row)} style={{ padding: '6px 10px' }}>
                    Retry
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: 12, color: '#777' }}>
                  Нет данных. Введите query и нажмите “Найти”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button disabled={!cursor || loading} onClick={() => onSearch(false)} style={{ padding: '8px 10px' }}>
          Next page
        </button>
      </div>
    </div>
  );
}

