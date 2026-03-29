import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  FileCheck2,
  FolderKanban,
  FolderOpen,
  Headphones,
  Image as ImageIcon,
  Inbox,
  LayoutTemplate,
  MapPin,
  MessageSquare,
  Search,
  ShieldCheck,
  Tags,
  Users,
} from 'lucide-react';

import { listPageToolbarSearch } from '@/pages/sections/section-toolbar';
import { formatDateShort, formatDateTime, formatMoney } from '@/shared/lib/format';
import { FilterBar, FilterField } from '@/shared/layout/filter-bar';
import { MockListScreen, type MockColumnDef } from '@/shared/layout/mock-list-screen';
import { getMockAdminUsers, type AdminUserRow } from '@/shared/mock/admin-users';
import { getMockArticles, type ArticleRow } from '@/shared/mock/articles';
import { getMockCatalogConsistency, type CatalogConsistencyRow } from '@/shared/mock/catalog-consistency';
import { getMockChatThreads, type ChatThreadRow } from '@/shared/mock/chat';
import { getMockCities, type CityRow } from '@/shared/mock/cities';
import { getMockCollections, type CollectionRow } from '@/shared/mock/collections';
import { getMockFinanceDocuments, type FinanceDocumentRow } from '@/shared/mock/finance-documents';
import { getMockLandings, type LandingRow } from '@/shared/mock/landings';
import { getMockModerationQueue, type ModerationQueueRow } from '@/shared/mock/moderation';
import { getMockPromoBlocks, type PromoBlockRow } from '@/shared/mock/promo-blocks';
import { getMockReconciliation, type ReconciliationRow } from '@/shared/mock/reconciliation';
import { getMockReviews, type ReviewRow } from '@/shared/mock/reviews';
import { getMockSeoAudit } from '@/shared/mock/seo-audit';
import { getMockSupportTickets, type SupportTicketRow } from '@/shared/mock/support';
import { getMockTags, type TagRow } from '@/shared/mock/tags';
import { cn } from '@/shared/lib/cn';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ListPageLayout } from '@/shared/layout/list-page-layout';
import { PageGlyph } from '@/shared/ui/page-glyph';
import { SearchInput } from '@/shared/ui/search-input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { DataTableShell } from '@/widgets/data-table-shell/data-table-shell';
import { StatCard } from '@/widgets/stat-card/stat-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

function moderationTypeIcon(type: ModerationQueueRow['type']) {
  if (type === 'Событие') return CalendarDays;
  if (type === 'Площадка') return Building2;
  return ImageIcon;
}

export function ModerationPage() {
  const [q, setQ] = useState('');
  const drafts = useMemo(() => {
    const list = getMockModerationQueue();
    if (!q.trim()) return list;
    const n = q.toLowerCase();
    return list.filter((r) => `${r.title} ${r.supplier} ${r.summary}`.toLowerCase().includes(n));
  }, [q]);

  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (drafts.length === 0) return;
    if (!selectedId || !drafts.some((r) => r.id === selectedId)) {
      setSelectedId(drafts[0].id);
    }
  }, [drafts, selectedId]);

  const selected = drafts.find((r) => r.id === selectedId);
  const TypeIcon = selected ? moderationTypeIcon(selected.type) : CalendarDays;

  return (
    <ListPageLayout
      title="Модерация"
      subtitle="Слева — очередь черновиков, справа — карточка на проверку. Только макет без реального API."
      headerGlyph={<PageGlyph icon={ShieldCheck} tone="violet" />}
      headerActions={<Button variant="secondary">Правила модерации</Button>}
    >
      <div className="flex min-h-[min(72vh,600px)] flex-col overflow-hidden rounded-card border border-border-soft bg-surface shadow-soft lg:min-h-[520px] lg:flex-row">
        <aside className="flex max-h-[min(42vh,360px)] w-full flex-shrink-0 flex-col border-border-soft lg:max-h-none lg:w-[300px] lg:border-r xl:w-[320px]">
          <div className="border-b border-border-soft bg-surface-alt/40 px-3 py-3">
            <SearchInput placeholder="Поиск черновика…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
            {drafts.length === 0 ? (
              <p className="px-2 py-8 text-center text-small text-text-muted">Нет черновиков по запросу.</p>
            ) : (
              drafts.map((row) => {
                const RowIcon = moderationTypeIcon(row.type);
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setSelectedId(row.id)}
                    className={cn(
                      'flex w-full gap-2.5 rounded-control border px-2.5 py-2.5 text-left transition-colors',
                      selectedId === row.id
                        ? 'border-accent/35 bg-[hsl(var(--accent)_/_0.09)] shadow-sm'
                        : 'border-transparent hover:bg-surface-alt',
                    )}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(220_28%_94%)] text-[hsl(220_22%_38%)]">
                      <RowIcon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 font-medium text-text-primary">{row.title}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[0.6875rem] text-text-muted">
                        <span className="text-text-muted">{row.type}</span>
                        <span className="text-text-muted">·</span>
                        <span className="text-text-muted">{formatDateTime(row.submittedAt)}</span>
                      </span>
                      <span className="mt-1.5 inline-block">
                        <Badge
                          variant={
                            row.status === 'Отклонено'
                              ? 'danger'
                              : row.status === 'Ожидает'
                                ? 'warning'
                                : 'accent'
                          }
                          className="text-[0.625rem]"
                        >
                          {row.status}
                        </Badge>
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="flex min-h-[320px] flex-1 flex-col overflow-y-auto border-t border-border-soft bg-page/25 p-5 sm:p-6 lg:border-l-0 lg:border-t-0">
          {selected ? (
            <div className="mx-auto w-full max-w-content space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3 sm:gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[hsl(262_42%_95%)] text-[hsl(262_32%_44%)] sm:h-14 sm:w-14">
                    <TypeIcon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.75} aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="text-label font-medium text-text-muted">{selected.type}</p>
                    <h2 className="text-h2 text-text-primary">{selected.title}</h2>
                    <p className="mt-1 text-small text-text-secondary">
                      Поставщик: <span className="font-medium text-text-primary">{selected.supplier}</span>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-small text-text-muted">
                      {selected.city ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" aria-hidden /> {selected.city}
                        </span>
                      ) : null}
                      {selected.duration ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-text-muted">Длительность:</span> {selected.duration}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex flex-shrink-0 flex-wrap gap-2">
                  <Button size="md">Одобрить</Button>
                  <Button variant="secondary" size="md">
                    На доработку
                  </Button>
                  <Button variant="destructive" size="md">
                    Отклонить
                  </Button>
                </div>
              </div>

              <div className="rounded-card border border-border-soft bg-surface p-4 sm:p-5">
                <h3 className="text-label font-semibold uppercase tracking-wide text-text-muted">Черновик для проверки</h3>
                <p className="mt-3 whitespace-pre-wrap text-body text-text-primary">{selected.summary}</p>
              </div>

              <div className="rounded-card border border-dashed border-border-soft bg-surface-alt/40 p-6 text-center text-small text-text-muted">
                Здесь будут медиа, SEO-поля и история решений — пока заглушка под следующий макет.
              </div>
            </div>
          ) : (
            <p className="m-auto text-body text-text-muted">Выберите черновик в списке слева.</p>
          )}
        </section>
      </div>
    </ListPageLayout>
  );
}

export function CitiesPage() {
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const all = getMockCities();
    if (!q.trim()) return all;
    const n = q.toLowerCase();
    return all.filter((r) => `${r.name} ${r.region}`.toLowerCase().includes(n));
  }, [q]);
  const cols: MockColumnDef<CityRow>[] = [
    { id: 'name', header: 'Город', cell: (r) => <span className="font-medium text-text-primary">{r.name}</span> },
    { id: 'region', header: 'Регион', cell: (r) => r.region },
    { id: 'slug', header: 'Slug', cell: (r) => <code className="text-small text-text-secondary">{r.slug}</code> },
    { id: 'cnt', header: 'События', cell: (r) => r.eventsCount },
    { id: 'upd', header: 'Обновлено', cell: (r) => formatDateTime(r.updatedAt) },
  ];
  return (
    <MockListScreen
      title="Города"
      subtitle="Справочник городов — mock-данные."
      headerGlyph={<PageGlyph icon={MapPin} tone="mint" />}
      headerActions={<Button variant="secondary">Добавить город</Button>}
      toolbar={listPageToolbarSearch('Поиск…', q, setQ)}
      columns={cols}
      rows={rows}
      getRowId={(r) => r.id}
    />
  );
}

export function TagsPage() {
  const rows = getMockTags();
  const cols: MockColumnDef<TagRow>[] = [
    { id: 'name', header: 'Тег', cell: (r) => <span className="font-medium text-text-primary">{r.name}</span> },
    { id: 'slug', header: 'Slug', cell: (r) => <code className="text-small">{r.slug}</code> },
    { id: 'use', header: 'Использований', cell: (r) => r.usageCount },
  ];
  return (
    <MockListScreen
      title="Теги"
      subtitle="Таксономия для каталога."
      headerGlyph={<PageGlyph icon={Tags} tone="rose" />}
      headerActions={<Button variant="secondary">Новый тег</Button>}
      columns={cols}
      rows={rows}
      getRowId={(r) => r.id}
    />
  );
}

export function ArticlesPage() {
  const rows = getMockArticles();
  const cols: MockColumnDef<ArticleRow>[] = [
    { id: 'title', header: 'Заголовок', cell: (r) => <span className="font-medium text-text-primary">{r.title}</span> },
    { id: 'slug', header: 'Slug', cell: (r) => <code className="text-small">{r.slug}</code> },
    {
      id: 'status',
      header: 'Статус',
      cell: (r) => <Badge variant={r.status === 'В продакшене' ? 'success' : 'default'}>{r.status}</Badge>,
    },
    { id: 'pub', header: 'Публикация', cell: (r) => (r.publishedAt ? formatDateShort(r.publishedAt) : '—') },
  ];
  return (
    <MockListScreen
      title="Статьи"
      subtitle="Редакционный контент."
      headerGlyph={<PageGlyph icon={BookOpen} tone="peach" />}
      headerActions={<Button variant="secondary">Новая статья</Button>}
      columns={cols}
      rows={rows}
      getRowId={(r) => r.id}
    />
  );
}

export function CollectionsPage() {
  const rows = getMockCollections();
  const cols: MockColumnDef<CollectionRow>[] = [
    { id: 'title', header: 'Подборка', cell: (r) => <span className="font-medium text-text-primary">{r.title}</span> },
    { id: 'slug', header: 'Slug', cell: (r) => <code className="text-small">{r.slug}</code> },
    { id: 'items', header: 'Элементов', cell: (r) => r.itemsCount },
    {
      id: 'status',
      header: 'Статус',
      cell: (r) => <Badge variant={r.status === 'Опубликовано' ? 'success' : 'default'}>{r.status}</Badge>,
    },
  ];
  return (
    <MockListScreen
      title="Подборки"
      subtitle="Курируемые подборки на сайте."
      headerGlyph={<PageGlyph icon={FolderOpen} tone="violet" />}
      headerActions={<Button variant="secondary">Новая подборка</Button>}
      columns={cols}
      rows={rows}
      getRowId={(r) => r.id}
    />
  );
}

export function LandingsPage() {
  const rows = getMockLandings();
  const cols: MockColumnDef<LandingRow>[] = [
    { id: 'title', header: 'Лендинг', cell: (r) => <span className="font-medium text-text-primary">{r.title}</span> },
    { id: 'path', header: 'Путь', cell: (r) => <code className="text-small">{r.path}</code> },
    {
      id: 'status',
      header: 'Статус',
      cell: (r) => <Badge variant={r.status === 'Активен' ? 'success' : 'default'}>{r.status}</Badge>,
    },
    { id: 'upd', header: 'Обновлено', cell: (r) => formatDateTime(r.updatedAt) },
  ];
  return (
    <MockListScreen
      title="Лендинги"
      subtitle="Посадочные страницы и кампании."
      headerGlyph={<PageGlyph icon={LayoutTemplate} tone="sky" />}
      headerActions={<Button variant="secondary">Создать</Button>}
      columns={cols}
      rows={rows}
      getRowId={(r) => r.id}
    />
  );
}

export function PromoBlocksPage() {
  const rows = getMockPromoBlocks();
  const cols: MockColumnDef<PromoBlockRow>[] = [
    { id: 'name', header: 'Блок', cell: (r) => <span className="font-medium text-text-primary">{r.name}</span> },
    { id: 'zone', header: 'Зона', cell: (r) => r.zone },
    {
      id: 'active',
      header: 'Активен',
      cell: (r) => <Badge variant={r.active ? 'success' : 'default'}>{r.active ? 'Да' : 'Нет'}</Badge>,
    },
    { id: 'period', header: 'Период', cell: (r) => r.period },
  ];
  return (
    <MockListScreen
      title="Промо-блоки"
      subtitle="Баннеры и промо-зоны."
      headerGlyph={<PageGlyph icon={BarChart3} tone="amber" />}
      headerActions={<Button variant="secondary">Новый блок</Button>}
      columns={cols}
      rows={rows}
      getRowId={(r) => r.id}
    />
  );
}

export function FinanceDocumentsPage() {
  const rows = getMockFinanceDocuments();
  const cols: MockColumnDef<FinanceDocumentRow>[] = [
    { id: 'num', header: 'Номер', cell: (r) => <span className="font-mono text-small">{r.number}</span> },
    { id: 'supplier', header: 'Поставщик', cell: (r) => r.supplier },
    { id: 'kind', header: 'Тип', cell: (r) => r.kind },
    { id: 'amount', header: 'Сумма', cell: (r) => formatMoney(r.amount, r.currency) },
    {
      id: 'status',
      header: 'Статус',
      cell: (r) => (
        <Badge variant={r.status === 'Оплачен' ? 'success' : r.status === 'Спор' ? 'danger' : 'warning'}>
          {r.status}
        </Badge>
      ),
    },
    { id: 'date', header: 'Дата', cell: (r) => formatDateShort(r.date) },
  ];
  return (
    <MockListScreen
      title="Фин. документы"
      subtitle="Акты, счета и отчётность (mock)."
      headerGlyph={<PageGlyph icon={FileCheck2} tone="slate" />}
      headerActions={<Button variant="secondary">Выгрузка</Button>}
      columns={cols}
      rows={rows}
      getRowId={(r) => r.id}
    />
  );
}

export function ReviewsPage() {
  const rows = getMockReviews();
  const cols: MockColumnDef<ReviewRow>[] = [
    { id: 'event', header: 'Событие', cell: (r) => <span className="font-medium text-text-primary">{r.eventTitle}</span> },
    { id: 'author', header: 'Автор', cell: (r) => r.author },
    { id: 'rating', header: 'Оценка', cell: (r) => <Badge variant="accent">{r.rating}</Badge> },
    {
      id: 'status',
      header: 'Статус',
      cell: (r) => (
        <Badge variant={r.status === 'Новый' ? 'warning' : r.status === 'Опубликован' ? 'success' : 'default'}>
          {r.status}
        </Badge>
      ),
    },
    { id: 'created', header: 'Создан', cell: (r) => formatDateTime(r.createdAt) },
  ];
  return (
    <MockListScreen
      title="Отзывы"
      subtitle="Модерация отзывов покупателей."
      headerGlyph={<PageGlyph icon={MessageSquare} tone="rose" />}
      columns={cols}
      rows={rows}
      getRowId={(r) => r.id}
    />
  );
}

export function ReconciliationPage() {
  const rows = getMockReconciliation();
  const cols: MockColumnDef<ReconciliationRow>[] = [
    { id: 'period', header: 'Период', cell: (r) => r.period },
    { id: 'supplier', header: 'Поставщик', cell: (r) => r.supplier },
    {
      id: 'delta',
      header: 'Δ, ₽',
      cell: (r) => (
        <span className={r.deltaRub !== 0 ? 'font-medium text-warning' : 'text-text-secondary'}>{r.deltaRub}</span>
      ),
    },
    {
      id: 'status',
      header: 'Статус',
      cell: (r) => (
        <Badge variant={r.status === 'Сверено' ? 'success' : r.status === 'Расхождение' ? 'danger' : 'warning'}>
          {r.status}
        </Badge>
      ),
    },
  ];
  return (
    <MockListScreen
      title="Сверка"
      subtitle="Сверка взаиморасчётов с поставщиками."
      headerGlyph={<PageGlyph icon={Search} tone="slate" />}
      headerActions={<Button variant="secondary">Запустить сверку</Button>}
      columns={cols}
      rows={rows}
      getRowId={(r) => r.id}
    />
  );
}

export function SupportPage() {
  const [status, setStatus] = useState('');
  const rows = useMemo(() => {
    const all = getMockSupportTickets();
    if (!status) return all;
    return all.filter((r) => r.status === status);
  }, [status]);
  const cols: MockColumnDef<SupportTicketRow>[] = [
    { id: 'code', header: 'Тикет', cell: (r) => <span className="font-mono text-small">{r.code}</span> },
    { id: 'subject', header: 'Тема', cell: (r) => <span className="font-medium text-text-primary">{r.subject}</span> },
    { id: 'cat', header: 'Категория', cell: (r) => r.category },
    {
      id: 'status',
      header: 'Статус',
      cell: (r) => (
        <Badge
          variant={
            r.status === 'Открыт' ? 'warning' : r.status === 'В работе' ? 'accent' : 'success'
          }
        >
          {r.status}
        </Badge>
      ),
    },
    { id: 'upd', header: 'Обновлён', cell: (r) => formatDateTime(r.updatedAt) },
  ];
  return (
    <MockListScreen
      title="Поддержка"
      subtitle="Тикеты обращений."
      headerGlyph={<PageGlyph icon={Headphones} tone="sky" />}
      toolbar={
        <FilterBar>
          <FilterField label="Статус">
            <select
              className="flex h-10 w-full min-h-[var(--control-height)] rounded-control border border-border-soft bg-surface px-3 text-body"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Все</option>
              <option value="Открыт">Открыт</option>
              <option value="В работе">В работе</option>
              <option value="Закрыт">Закрыт</option>
            </select>
          </FilterField>
        </FilterBar>
      }
      columns={cols}
      rows={rows}
      getRowId={(r) => r.id}
    />
  );
}

export function ChatPage() {
  const rows = getMockChatThreads();
  const cols: MockColumnDef<ChatThreadRow>[] = [
    { id: 'user', header: 'Пользователь', cell: (r) => <span className="font-medium text-text-primary">{r.user}</span> },
    { id: 'preview', header: 'Последнее сообщение', cell: (r) => <span className="text-text-secondary">{r.preview}</span> },
    {
      id: 'unread',
      header: 'Не прочитано',
      cell: (r) => (r.unread > 0 ? <Badge variant="accent">{r.unread}</Badge> : <span className="text-text-muted">—</span>),
    },
    { id: 'upd', header: 'Активность', cell: (r) => formatDateTime(r.updatedAt) },
  ];
  return (
    <MockListScreen
      title="Чат"
      subtitle="Входящие диалоги (mock inbox)."
      headerGlyph={<PageGlyph icon={Inbox} tone="mint" />}
      columns={cols}
      rows={rows}
      getRowId={(r) => r.id}
    />
  );
}

export function SeoAuditPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'catalog' ? 'catalog' : 'seo';

  const setTab = (v: string) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (v === 'catalog') p.set('tab', 'catalog');
        else p.delete('tab');
        return p;
      },
      { replace: true },
    );
  };

  const seoRows = getMockSeoAudit();
  const avg = seoRows.length ? Math.round(seoRows.reduce((s, r) => s + r.score, 0) / seoRows.length) : 0;
  const totalIssues = seoRows.reduce((s, r) => s + r.issues, 0);

  const catalogRows = getMockCatalogConsistency();
  const catalogCols: MockColumnDef<CatalogConsistencyRow>[] = [
    { id: 'entity', header: 'Сущность', cell: (r) => r.entity },
    { id: 'issue', header: 'Проблема', cell: (r) => <span className="text-text-primary">{r.issue}</span> },
    {
      id: 'sev',
      header: 'Важность',
      cell: (r) => (
        <Badge variant={r.severity === 'Высокий' ? 'danger' : r.severity === 'Средний' ? 'warning' : 'default'}>
          {r.severity}
        </Badge>
      ),
    },
    { id: 'cnt', header: 'Кол-во', cell: (r) => r.count },
  ];

  return (
    <ListPageLayout
      title="SEO-аудит"
      subtitle="Проверки страниц и согласованность данных каталога (макет)."
      headerGlyph={<PageGlyph icon={Search} tone="sky" />}
      headerActions={
        tab === 'seo' ? (
          <Button variant="secondary">Запустить проверку</Button>
        ) : (
          <Button variant="secondary">Обновить отчёт</Button>
        )
      }
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="seo">
            <Search className="h-4 w-4 shrink-0 opacity-80" strokeWidth={2} aria-hidden />
            SEO
          </TabsTrigger>
          <TabsTrigger value="catalog">
            <FolderKanban className="h-4 w-4 shrink-0 opacity-80" strokeWidth={2} aria-hidden />
            Согласованность каталога
          </TabsTrigger>
        </TabsList>
        <TabsContent value="seo">
          <div className="mb-10 grid gap-4 sm:grid-cols-3">
            <StatCard label="Средний score" value={`${avg}`} hint="по выборке моков" />
            <StatCard label="Всего замечаний" value={`${totalIssues}`} />
            <StatCard label="Страниц в отчёте" value={`${seoRows.length}`} />
          </div>
          <DataTableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Путь</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Issues</TableHead>
                  <TableHead>Проверено</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seoRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <code className="text-small text-text-primary">{r.path}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="accent">{r.score}</Badge>
                    </TableCell>
                    <TableCell className="text-text-secondary">{r.issues}</TableCell>
                    <TableCell className="text-small text-text-muted">{formatDateTime(r.checkedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableShell>
        </TabsContent>
        <TabsContent value="catalog">
          <p className="text-small text-text-secondary pb-2">
            Автоматические проверки целостности данных.
          </p>
          <DataTableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  {catalogCols.map((c) => (
                    <TableHead key={c.id}>{c.header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {catalogRows.map((row) => (
                  <TableRow key={row.id}>
                    {catalogCols.map((c) => (
                      <TableCell key={c.id}>{c.cell(row)}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableShell>
        </TabsContent>
      </Tabs>
    </ListPageLayout>
  );
}

export function UsersPage() {
  const rows = getMockAdminUsers();
  const cols: MockColumnDef<AdminUserRow>[] = [
    { id: 'name', header: 'Имя', cell: (r) => <span className="font-medium text-text-primary">{r.name}</span> },
    { id: 'email', header: 'Email', cell: (r) => <span className="text-small text-text-secondary">{r.email}</span> },
    { id: 'role', header: 'Роль', cell: (r) => <Badge variant={r.role === 'Админ' ? 'accent' : 'default'}>{r.role}</Badge> },
    { id: 'login', header: 'Последний вход', cell: (r) => (r.lastLoginAt ? formatDateTime(r.lastLoginAt) : '—') },
  ];
  return (
    <MockListScreen
      title="Пользователи"
      subtitle="Аккаунты бэк-офиса (mock)."
      headerGlyph={<PageGlyph icon={Users} tone="violet" />}
      headerActions={<Button variant="secondary">Пригласить</Button>}
      columns={cols}
      rows={rows}
      getRowId={(r) => r.id}
    />
  );
}
