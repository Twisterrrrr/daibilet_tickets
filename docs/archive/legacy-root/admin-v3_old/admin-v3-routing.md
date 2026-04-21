# Moved

Этот документ объединён в [`Implementation-Guide.md`](Implementation-Guide.md).
- `/events`, `/events/:id`
- `/venues`, `/venues/:id`
- `/cities`, `/cities/:id`
- `/suppliers`, `/suppliers/:id`
- `/collections`, `/collections/:id`
- `/landings`, `/landings/:id`
- `/tags`
- `/seo-audit`
- `/chat`, `/chat/:id`
- `/reviews`
- `*` → redirect на `/dashboard`

## 3) Feature flags: принцип “не рендерить / не пускать / не запрашивать”

### Конфиг
`packages/frontend-admin-v3/src/config/features.ts`

Флаги (env → boolean):
- `VITE_ADMIN_V3_FEATURE_SALES`
- `VITE_ADMIN_V3_FEATURE_FINANCE`
- `VITE_ADMIN_V3_FEATURE_REPORTS`
- `VITE_ADMIN_V3_FEATURE_USERS`
- `VITE_ADMIN_V3_FEATURE_INTERNAL_EVENTS`
- `VITE_ADMIN_V3_FEATURE_WHITE_LABEL`
- `VITE_ADMIN_V3_FEATURE_SUPPORT_ADVANCED`

### Использование
1) **Sidebar visibility**\n\n`packages/frontend-admin-v3/src/app/layout/Sidebar.tsx` фильтрует пункты меню через `isFeatureEnabled(item.feature)`.\n\n2) **Route guards**\n\n`packages/frontend-admin-v3/src/lib/guards/FeatureRoute.tsx`:\n- если feature disabled → показываем `FeatureDisabledPage`\n- иначе рендерим children\n\n3) **Data fetching guards**\n\nПравило: если раздел скрыт — его компоненты не монтируются (route guard), следовательно **хуки запросов не исполняются**.\n\n## 4) Fallback “Feature disabled”\n\nСтраница:\n- `packages/frontend-admin-v3/src/pages/feature-disabled/FeatureDisabledPage.tsx`\n\nИспользование:\n- напрямую по `/feature-disabled`\n- или через `FeatureRoute` на скрытых разделах\n+
