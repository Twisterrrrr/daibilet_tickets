/**
 * Чеклисты для экранов Admin V2: что подключать к API legacy / бэкенду.
 * Используются в раскрывающемся блоке «План интеграции» на страницах.
 */
export interface AdminV2BlueprintStep {
  title: string;
  detail?: string;
}

export interface AdminV2BlueprintSpec {
  screen: string;
  steps: AdminV2BlueprintStep[];
}

export const blueprintDashboard: AdminV2BlueprintSpec = {
  screen: 'Дашборд',
  steps: [
    { title: 'Сводные метрики', detail: 'Агрегаты заказов, выручки, активных событий — отдельный endpoint или сборка из отчётов.' },
    { title: 'Сигналы «требует внимания»', detail: 'Счётчики по модерации, SEO, сверке; ссылки совпадают с реальными списками.' },
    { title: 'Быстрые переходы', detail: 'Маршруты V2 уже есть — проверить RBAC и deep links.' },
  ],
};

export const blueprintEventsList: AdminV2BlueprintSpec = {
  screen: 'События (список)',
  steps: [
    { title: 'Список и фильтры', detail: 'GET /admin/events с пагинацией, поиск, фильтры по городу/статусу/источнику.' },
    { title: 'Создание', detail: 'Мастер V2 `/events/new` (волна M — моки); волна R — POST create + batch-create слотов.' },
    { title: 'Колонки таблицы', detail: 'Сопоставить с полями ответа API; скрытие колонок — только UI.' },
  ],
};

export const blueprintEventMaster: AdminV2BlueprintSpec = {
  screen: 'Мастер события (V2)',
  steps: [
    { title: 'Навигация', detail: 'Вкладки мастера: Информация, Билеты и квоты, Расписание, Медиа, SEO; после create — Продажи и Качество. Кнопка «Посмотреть» — превью витрины (мок). Первый POST после черновика — из «Информации».' },
    { title: 'Расписание', detail: 'Разовое / повторяющееся (сетка) / OPEN_DATE без сеансов; общий сервис слотов для admin и supplier.' },
    { title: 'Поставщик', detail: 'Тот же UX в supplier V2 с урезанным RBAC; не использовать PUT syncSessions для мастера.' },
  ],
};

export const blueprintEventDetail: AdminV2BlueprintSpec = {
  screen: 'Событие (карточка)',
  steps: [
    { title: 'Заголовок', detail: 'GET /admin/events/:id, override-поля при необходимости.' },
    { title: 'Вкладки', detail: 'Основное — PATCH override; сеансы — только вкладка события (sessions API, как ScheduleTab в legacy); тарифы — offers; SEO/медиа/quality — существующие эндпоинты.' },
    { title: 'Действия', detail: 'Публикация, дублирование, предпросмотр — как в frontend-admin.' },
  ],
};

export const blueprintVenuesList: AdminV2BlueprintSpec = {
  screen: 'Площадки (список)',
  steps: [
    { title: 'Список', detail: 'GET /admin/venues, фильтры по городу, статусу, типу (VenueType в Prisma).' },
    { title: 'Создание / правка', detail: 'POST/PATCH площадки; не смешивать с Location (причалы/старт маршрута).' },
  ],
};

export const blueprintVenueDetail: AdminV2BlueprintSpec = {
  screen: 'Площадка (карточка)',
  steps: [
    { title: 'Карточка', detail: 'GET /admin/venues/:id, программа событий площадки.' },
    { title: 'Связь с событиями', detail: 'Фильтр событий по venueId в каталоге.' },
  ],
};

export const blueprintOrdersList: AdminV2BlueprintSpec = {
  screen: 'Заказы',
  steps: [
    { title: 'Список', detail: 'GET /admin/orders (или текущий контракт legacy), фильтры по статусу и поиск.' },
    { title: 'Карточка заказа', detail: 'Экран /orders/:id в V2 — GET /admin/orders/:id, позиции, связи с событием и поставщиком.' },
  ],
};

export const blueprintOrderDetail: AdminV2BlueprintSpec = {
  screen: 'Заказ (карточка)',
  steps: [
    { title: 'Заголовок', detail: 'GET /admin/orders/:id — статус, суммы, способ оплаты, внешний id платежа (маскированный).' },
    { title: 'Позиции', detail: 'Строки заказа / офферы; согласовать с checkout и Order в Prisma.' },
    { title: 'Связи', detail: 'eventId, supplierId — deep link в карточки каталога.' },
  ],
};

export const blueprintSupplierDetail: AdminV2BlueprintSpec = {
  screen: 'Поставщик (карточка)',
  steps: [
    { title: 'Профиль', detail: 'GET /admin/suppliers/:id — юр. данные, статус, оператор.' },
    { title: 'Контакты и заметки', detail: 'Каналы связи, внутренние комментарии менеджера.' },
    { title: 'Каталог', detail: 'Счётчики событий, качество; фильтр событий по supplierId.' },
  ],
};

export const blueprintSuppliersList: AdminV2BlueprintSpec = {
  screen: 'Поставщики',
  steps: [
    { title: 'Каталог', detail: 'GET /admin/suppliers, статусы и метрики как в прод-админке.' },
    { title: 'Карточка поставщика', detail: 'Экран /suppliers/:id — GET /admin/suppliers/:id, контакты, метрики, заметки.' },
  ],
};

export const blueprintModeration: AdminV2BlueprintSpec = {
  screen: 'Модерация',
  steps: [
    { title: 'Очередь', detail: 'Источник черновиков (события/площадки/контент) из workflow модерации.' },
    { title: 'Решения', detail: 'Одобрить / доработка / отклонить — вызовы тех же сервисов, что в legacy.' },
  ],
};

export const blueprintCities: AdminV2BlueprintSpec = {
  screen: 'Города (список)',
  steps: [
    { title: 'Справочник', detail: 'GET /admin/cities; создание/правка — POST/PATCH по контракту бэка.' },
    { title: 'Связь с каталогом', detail: 'Подсчёт событий на город из агрегата или кэша.' },
    { title: 'Хаб города', detail: 'Отдельная карточка /cities/:id — описание, зоны контента, KPI, ссылки в события и площадки (как на витрине, не только slug).' },
  ],
};

export const blueprintCityHub: AdminV2BlueprintSpec = {
  screen: 'Город (хаб)',
  steps: [
    { title: 'Данные', detail: 'GET /admin/cities/:id — поля модели City (slug, description, geo, meta, flags) + агрегаты каталога.' },
    { title: 'Вкладки UI', detail: 'Обзор / Основное / Контент / SEO / Каталог — соответствие секциям формы legacy без «полотна».' },
    { title: 'Контентные зоны', detail: 'Коллекции, промо — отдельные сущности или вложенные экраны; зоны на вкладке «Контент».' },
    { title: 'Навигация', detail: 'Deep link в списки событий/площадок с префильтром cityId.' },
  ],
};

export const blueprintTags: AdminV2BlueprintSpec = {
  screen: 'Теги',
  steps: [
    { title: 'CRUD', detail: 'Админ API тегов (как в основной админке), usageCount из агрегации.' },
  ],
};

export const blueprintArticles: AdminV2BlueprintSpec = {
  screen: 'Статьи',
  steps: [
    { title: 'Список и редактор', detail: 'Интеграция с CMS или внутренними статьями — эндпоинты проекта.' },
  ],
};

export const blueprintArticleDetail: AdminV2BlueprintSpec = {
  screen: 'Статья (карточка)',
  steps: [
    { title: 'Данные', detail: 'GET/PATCH статьи: тело, slug, статус публикации, обложка, автор.' },
    { title: 'Вкладки', detail: 'Обзор / Контент / SEO / Системное — без полотна, формы по мере переноса API.' },
  ],
};

export const blueprintCollections: AdminV2BlueprintSpec = {
  screen: 'Подборки',
  steps: [
    { title: 'Подборки каталога', detail: 'Collection API /admin/collections и элементы подборки.' },
  ],
};

export const blueprintCollectionDetail: AdminV2BlueprintSpec = {
  screen: 'Подборка (карточка)',
  steps: [
    { title: 'Карточка', detail: 'GET/PATCH коллекции, порядок и состав элементов (события, ручные пины).' },
    { title: 'Вкладки', detail: 'Обзор / Состав / SEO / Системное.' },
  ],
};

export const blueprintLandings: AdminV2BlueprintSpec = {
  screen: 'Лендинги',
  steps: [
    { title: 'Лендинги', detail: 'GET/PATCH /admin/landings (или актуальный модуль landing в монорепе).' },
    { title: 'Мультилендинги', detail: 'Несколько LandingPage с одним slug в разных городах — режим «По slug» и хаб /landings/topics/:slug.' },
  ],
};

export const blueprintLandingDetail: AdminV2BlueprintSpec = {
  screen: 'Лендинг (карточка)',
  steps: [
    { title: 'Материализация', detail: 'Блоки страницы (hero, сетки, FAQ) — тот же контракт, что у landing materializer.' },
    { title: 'Вкладки', detail: 'Обзор / Блоки / SEO / Системное.' },
  ],
};

export const blueprintLandingTopicHub: AdminV2BlueprintSpec = {
  screen: 'Мультилендинг (тема по slug)',
  steps: [
    { title: 'Агрегация', detail: 'Запрос лендингов с slug=:slug и группировка по cityId; ссылки на карточки /admin/landings/:id.' },
    { title: 'Витрина', detail: 'Согласовать с Next: один публичный путь /cities/:citySlug/:landingSlug — материализация по паре город+slug.' },
  ],
};

export const blueprintMarketingPromoCodes: AdminV2BlueprintSpec = {
  screen: 'Маркетинг — промокоды',
  steps: [
    { title: 'CRUD промокодов', detail: 'Админ API скидок: код, тип, лимиты, период, сегменты аудитории — по контракту legacy.' },
    { title: 'Аналитика', detail: 'Список списаний / отчёт по кампании.' },
  ],
};

export const blueprintMarketingPromoCollections: AdminV2BlueprintSpec = {
  screen: 'Маркетинг — промо-подборки',
  steps: [
    { title: 'Сущность', detail: 'Курируемые подборки для промо-зон (не путать с Collection каталога).' },
    { title: 'Размещения', detail: 'Привязка к зонам витрины и периодам показа.' },
  ],
};

export const blueprintMarketingUpsells: AdminV2BlueprintSpec = {
  screen: 'Маркетинг — апселлы',
  steps: [
    { title: 'Правила', detail: 'Условия триггера (корзина, событие, сумма) и оффер; приоритет при конфликте.' },
    { title: 'Публикация', detail: 'Включение/выключение, A/B при необходимости.' },
  ],
};

export const blueprintPromoBlocks: AdminV2BlueprintSpec = {
  screen: 'Промо-блоки',
  steps: [
    { title: 'Зоны и баннеры', detail: 'API промо-блоков витрины, периоды показа, привязка к зонам.' },
  ],
};

export const blueprintPromoBlockDetail: AdminV2BlueprintSpec = {
  screen: 'Промо-блок (карточка)',
  steps: [
    { title: 'Правила показа', detail: 'Период, аудитория, приоритет, A/B, зона витрины.' },
    { title: 'Вкладки', detail: 'Обзор / Показ / Медиа / Системное.' },
  ],
};

export const blueprintFinanceDocuments: AdminV2BlueprintSpec = {
  screen: 'Фин. документы',
  steps: [
    { title: 'Документооборот', detail: 'Акты, счета — модули EDO/финансов админки, выгрузки.' },
  ],
};

export const blueprintReviews: AdminV2BlueprintSpec = {
  screen: 'Отзывы',
  steps: [
    { title: 'Модерация', detail: 'Список отзывов, смена статуса публикации, привязка к событию.' },
  ],
};

export const blueprintReconciliation: AdminV2BlueprintSpec = {
  screen: 'Сверка',
  steps: [
    { title: 'Периоды и поставщики', detail: 'Отчёты сверки, расхождения, статусы сверено/спор.' },
    { title: 'Запуск сверки', detail: 'Фоновая задача или синхронный отчёт — по текущей архитектуре.' },
  ],
};

export const blueprintSupport: AdminV2BlueprintSpec = {
  screen: 'Поддержка',
  steps: [
    { title: 'Тикеты', detail: 'Интеграция с helpdesk или внутренние тикеты; фильтр по статусу.' },
  ],
};

export const blueprintChat: AdminV2BlueprintSpec = {
  screen: 'Чат',
  steps: [
    { title: 'Диалоги', detail: 'WebSocket/REST для операторского чата, счётчик непрочитанных.' },
  ],
};

export const blueprintSeoAudit: AdminV2BlueprintSpec = {
  screen: 'SEO-аудит и согласованность',
  steps: [
    { title: 'Вкладка SEO', detail: 'Запуск проверок, сохранение score и issues по URL.' },
    { title: 'Согласованность каталога', detail: 'Отчёты целостности (сущности, дубли, битые ссылки) — связь с admin listing health при необходимости.' },
  ],
};

export const blueprintUsers: AdminV2BlueprintSpec = {
  screen: 'Пользователи бэк-офиса',
  steps: [
    { title: 'Учётные записи', detail: 'Список админ-пользователей, роли ADMIN/EDITOR и др., приглашения.' },
  ],
};

export const blueprintSettings: AdminV2BlueprintSpec = {
  screen: 'Настройки',
  steps: [
    { title: 'Секции', detail: 'GET/PATCH настроек по разделам (общее, SEO, маркетинг, интеграции).' },
    { title: 'Секреты', detail: 'Не хранить ключи в UI — только маскированные поля и ротация на бэке.' },
  ],
};

export const blueprintPlaceholder: AdminV2BlueprintSpec = {
  screen: 'Раздел (заглушка)',
  steps: [
    { title: 'Маршрут', detail: 'Добавить страницу в router.tsx и пункт в navigation.ts.' },
    { title: 'Данные', detail: 'Определить эндпоинты и заменить мок на клиент API.' },
  ],
};
