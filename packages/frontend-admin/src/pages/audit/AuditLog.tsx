import { useEffect, useState } from 'react';
import { adminApi } from '../../api/client';

interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  before: any;
  after: any;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
};

export function AuditLogPage() {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '30');
    if (entity) params.set('entity', entity);
    if (action) params.set('action', action);

    adminApi.get(`/admin/audit?${params}`)
      .then((data: any) => {
        setItems(data.items);
        setTotal(data.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, entity, action]);

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900">Журнал аудита</h1>

      {/* Фильтры */}
      <div className="mb-4 flex gap-3">
        <select
          value={entity}
          onChange={(e) => { setEntity(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Все сущности</option>
          <option value="City">City</option>
          <option value="Event">Event</option>
          <option value="Tag">Tag</option>
          <option value="LandingPage">Landing</option>
          <option value="ComboPage">Combo</option>
          <option value="Article">Article</option>
          <option value="UpsellItem">Upsell</option>
          <option value="Settings">Settings</option>
        </select>

        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Все действия</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
        </select>

        <span className="self-center text-sm text-gray-400">Всего: {total}</span>
      </div>

      {loading ? (
        <div className="text-gray-400">Загрузка...</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Дата</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Действие</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Сущность</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {items.map((item) => (
                <>
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                      {new Date(item.createdAt).toLocaleString('ru-RU')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[item.action] || 'bg-gray-100 text-gray-800'}`}>
                        {item.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.entity}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{item.entityId.substring(0, 8)}...</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{item.userId.substring(0, 8)}...</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                        className="text-xs text-primary-600 hover:text-primary-700"
                      >
                        {expanded === item.id ? 'Скрыть' : 'Детали'}
                      </button>
                    </td>
                  </tr>
                  {expanded === item.id && (
                    <tr key={`${item.id}-detail`}>
                      <td colSpan={6} className="bg-gray-50 px-4 py-3">
                        <div className="grid grid-cols-2 gap-4">
                          {item.before && (
                            <div>
                              <p className="mb-1 text-xs font-medium text-gray-500">Before:</p>
                              <pre className="max-h-40 overflow-auto rounded bg-white p-2 font-mono text-[10px] text-gray-600">
                                {JSON.stringify(item.before, null, 2)}
                              </pre>
                            </div>
                          )}
                          <div>
                            <p className="mb-1 text-xs font-medium text-gray-500">After / Data:</p>
                            <pre className="max-h-40 overflow-auto rounded bg-white p-2 font-mono text-[10px] text-gray-600">
                              {JSON.stringify(item.after, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Пагинация */}
      {total > 30 && (
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded border px-3 py-1 text-sm disabled:opacity-30"
          >
            Назад
          </button>
          <span className="text-sm text-gray-500">Стр. {page}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={items.length < 30}
            className="rounded border px-3 py-1 text-sm disabled:opacity-30"
          >
            Далее
          </button>
        </div>
      )}
    </div>
  );
}
