## Backoffice UI Guide (`@daibilet/shared-ui`)

Этот документ описывает, **как собирать экраны админки и ЛК поставщика** на примитивах из `@daibilet/shared-ui`.

### 1. Каркас приложения

- **Shell**: любые backoffice-приложения должны опираться на:

```tsx
<AppShell sidebar={sidebar} topbar={topbar}>
  <PageContainer>
    {/* содержимое страницы */}
  </PageContainer>
</AppShell>
```

- `sidebar` и `topbar` остаются специфичными для приложения (admin/supplier), но вёрстка и отступы — на стороне `AppShell`.

### 2. Заголовок страницы (`PageHeader`)

Единая точка входа для заголовков:

```tsx
<PageHeader
  title="Список городов"
  subtitle="Управление городами для событий и лендингов"
  actions={<Button>Создать</Button>}
/>
```

- `title`: основной заголовок (строка или ReactNode).
- `subtitle`: описание/контекст.
- `actions`: основное действие (создать, экспорт, фильтры и т.п.).

### 3. Секции контента

#### 3.1. Просмотрные блоки: `SectionCard`

Используется для дашбордов, карточек метрик, списков и таблиц:

```tsx
<SectionCard title="Финансовая сводка">
  {/* метрики, таблица, список */}
</SectionCard>
```

#### 3.2. Формы и детали: `FormSection`

Для редактируемых сущностей (города, поставщики, события, настройки):

```tsx
<FormSection
  title="Основные данные"
  description="Название, slug и ключевые настройки сущности"
>
  {/* FormGrid + поля */}
</FormSection>
```

### 4. Раскладка полей (`FormGrid`)

Используем `FormGrid` вместо ручных `grid`:

```tsx
<FormGrid>
  <FieldA />
  <FieldB />
</FormGrid>

<FormGrid columns={3}>
  <FieldA />
  <FieldB />
  <FieldC />
</FormGrid>
```

- `columns?: 1 | 2 | 3` — по умолчанию `2`.

### 5. Таблицы (admin)

Админские списки должны использовать общий `DataTable` (из `frontend-admin`), в паре с `SectionCard`:

```tsx
<SectionCard title="Список городов">
  <DataTable
    columns={columns}
    data={items}
    loading={loading}
    emptyText="Нет городов"
    onRowClick={handleRowClick}
  />
</SectionCard>
```

### 6. Состояния: loading / empty / error

#### 6.1. Загрузка — `LoadingState`

```tsx
if (loading) {
  return <LoadingState label="Загружаем данные..." />;
}
```

#### 6.2. Пусто — `EmptyState`

```tsx
if (!loading && items.length === 0) {
  return (
    <EmptyState
      title="Нет данных"
      description="Попробуйте изменить фильтры или создать первую запись."
    />
  );
}
```

#### 6.3. Ошибка — `ErrorState`

```tsx
if (error) {
  return (
    <ErrorState
      title="Ошибка загрузки"
      description={error}
      action={<Button onClick={reload}>Повторить</Button>}
    />
  );
}
```

### 7. Действия формы (`FormActions`, `StickyFormActions`)

#### 7.1. Обычные формы — `FormActions`

```tsx
<FormActions
  primary={
    <Button type="submit" disabled={saving}>
      {saving ? 'Сохранение...' : 'Сохранить'}
    </Button>
  }
  secondary={
    <Button variant="outline" onClick={onCancel}>
      Отмена
    </Button>
  }
/>
```

#### 7.2. Фиксированные действия внизу — `StickyFormActions`

Для длинных форм:

```tsx
<StickyFormActions>
  <Button variant="outline" onClick={onCancel}>Отмена</Button>
  <Button type="submit">Сохранить</Button>
</StickyFormActions>
```

### 8. Подтверждения (`ConfirmDialog`)

Общий паттерн подтверждения опасных действий:

```tsx
<ConfirmDialog
  open={open}
  onConfirm={handleDelete}
  onCancel={() => setOpen(false)}
  title="Удалить сущность?"
  description="Действие нельзя будет отменить."
  variant="destructive"
  confirmLabel="Удалить"
  cancelLabel="Отмена"
/>
```

### 9. Когда не менять legacy‑код

- Если страница:
  - завязана на сложную разметку или нестандартную JS‑логику;
  - или затрагивает контракты API/DTO/Prisma.
- В таких случаях допускается:
  - **обернуть** куски в `SectionCard`/`FormSection` для единых отступов;
  - **не трогать** внутреннюю структуру до отдельной задачи по рефакторингу.

### 10. TL;DR для новых экранов

1. Каркас страницы: `AppShell + PageHeader + PageContainer`.
2. Логику разбиваем на секции: `SectionCard` (просмотр) и `FormSection` (формы).
3. Поля формы — всегда через `FormGrid`.
4. Таблицы admin — `DataTable` + `SectionCard`.
5. Loading/Empty/Error — только через `LoadingState` / `EmptyState` / `ErrorState`.
6. Кнопки в формах — через `FormActions` (и при необходимости `StickyFormActions`).
7. Подтверждения — через `ConfirmDialog`.

