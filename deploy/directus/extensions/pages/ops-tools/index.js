import React, { useState } from 'react';
import { invalidate } from './api.js';

function uuid() {
  return (crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random()}`).toString();
}

export default function OpsToolsPage() {
  const [eventIds, setEventIds] = useState('');
  const [citySlugs, setCitySlugs] = useState('');
  const [paths, setPaths] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  async function run(body) {
    setLoading(true);
    setToast(null);
    try {
      const res = await invalidate({
        ...body,
        reason: 'directus_ops',
        idempotencyKey: `directus-inv-${uuid()}`,
      });
      setToast({ kind: 'ok', text: `OK: ${res.actionId}` });
    } catch (e) {
      setToast({ kind: 'err', text: e?.message || 'Ошибка' });
    } finally {
      setLoading(false);
    }
  }

  const parsedEventIds = eventIds.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  const parsedCitySlugs = citySlugs.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  const parsedPaths = paths.split(/\n+/).map((s) => s.trim()).filter(Boolean);

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <h1 style={{ margin: 0 }}>Ops Tools</h1>

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

      <div style={{ border: '1px solid #eee', padding: 12, display: 'grid', gap: 8 }}>
        <h3 style={{ margin: 0 }}>Invalidate EVENT by ids</h3>
        <textarea
          rows={2}
          value={eventIds}
          onChange={(e) => setEventIds(e.target.value)}
          placeholder="evt_1 evt_2 или через запятую"
          style={{ padding: 8 }}
        />
        <button
          disabled={loading || parsedEventIds.length === 0}
          onClick={() => run({ scope: 'EVENT', ids: parsedEventIds, paths: parsedPaths })}
          style={{ padding: 10 }}
        >
          Invalidate EVENT
        </button>
      </div>

      <div style={{ border: '1px solid #eee', padding: 12, display: 'grid', gap: 8 }}>
        <h3 style={{ margin: 0 }}>Invalidate CITY by slug</h3>
        <input
          value={citySlugs}
          onChange={(e) => setCitySlugs(e.target.value)}
          placeholder="spb msk"
          style={{ padding: 8 }}
        />
        <button
          disabled={loading || parsedCitySlugs.length === 0}
          onClick={() => run({ scope: 'CITY', ids: parsedCitySlugs, paths: parsedPaths })}
          style={{ padding: 10 }}
        >
          Invalidate CITY
        </button>
      </div>

      <div style={{ border: '1px solid #eee', padding: 12, display: 'grid', gap: 8 }}>
        <h3 style={{ margin: 0 }}>Invalidate GLOBAL (full)</h3>
        <button
          disabled={loading}
          onClick={() => run({ scope: 'GLOBAL', paths: parsedPaths })}
          style={{ padding: 10 }}
        >
          Invalidate FULL
        </button>
      </div>

      <div style={{ border: '1px solid #eee', padding: 12, display: 'grid', gap: 8 }}>
        <h3 style={{ margin: 0 }}>Optional: paths to revalidate (one per line)</h3>
        <textarea
          rows={4}
          value={paths}
          onChange={(e) => setPaths(e.target.value)}
          placeholder="/\n/spb\n/spb/event/slug"
          style={{ padding: 8 }}
        />
      </div>
    </div>
  );
}

