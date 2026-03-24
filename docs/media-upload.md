# Медиа: загрузка изображений (Cloudinary)

## Аудит (до внедрения)

- **Хранение в БД:** только URL и массивы URL (`Event.imageUrl`, `Event.galleryUrls`, `EventOverride.imageUrl`, `Venue.imageUrl`, `Venue.galleryUrls`, `Article.coverImage`, hero-поля у City/Region/Tag/Collection/Combo и т.д.). JSON-поля `templateData` / `contentTemplateData` / `venueTemplateData` могут содержать ссылки на изображения внутри блоков контента — отдельная нормализация не делалась в этом этапе.
- **Старый pipeline:** `UploadService` + локальный диск (`POST /api/v1/admin/upload/image`, `POST /api/v1/supplier/upload/image`) — Sharp → WebP, ответ `{ url, thumbUrl, filename }`. Остаётся для отзывов и прочих сценариев, не переведённых на Cloudinary.
- **Новый pipeline (MVP):** Cloudinary через Multer (memory) + единые эндпоинты `.../media/images`. В Prisma **новых таблиц нет** — URL по-прежнему пишутся в существующие поля.

## Целевое состояние MVP (lightweight)

- Один модуль backend `MediaModule`, два контроллера: `admin/media`, `supplier/media`.
- Общие React-компоненты в `@daibilet/shared-ui` (`ImageDropzone`, `SingleImageUploader`, `ImageGalleryManager`).
- Типы и адаптеры в `@daibilet/shared` (`MediaImageItem`, `MediaUploadAdapter`, мапперы URL ↔ UI).
- **Эволюция:** при необходимости позже добавить таблицу `MediaAsset` / связи с сущностями без смены контракта загрузки (ответ уже содержит `publicId`).

## Переменные окружения

| Переменная | Назначение |
|------------|------------|
| `CLOUDINARY_CLOUD_NAME` | Имя облака |
| `CLOUDINARY_API_KEY` | API Key |
| `CLOUDINARY_API_SECRET` | API Secret |
| `CLOUDINARY_FOLDER` | Опциональный префикс папки в Cloudinary |
| `MEDIA_MAX_FILE_BYTES` | Макс. размер одного файла (по умолчанию 10 MiB) |
| `MEDIA_MAX_FILES_PER_REQUEST` | Макс. файлов в одном multipart (по умолчанию 20, верх 50) |

Без настроенного Cloudinary новые эндпоинты возвращают **503** с понятным текстом.

## Backend API

- `POST /api/v1/admin/media/images` — `multipart/form-data`, поле **`files`** (один или несколько). Роли: `ADMIN`, `EDITOR`.
- `DELETE /api/v1/admin/media/images` — JSON `{ "publicIds": string[] }`.
- `POST /api/v1/supplier/media/images` — то же поле `files`. Роли поставщика: `OWNER`, `MANAGER`, `CONTENT`.
- `DELETE /api/v1/supplier/media/images` — JSON `{ "publicIds": string[] }`.

Ответ каждого загруженного файла:

`url`, `secureUrl`, `width`, `height`, `format`, `bytes`, `originalFilename`, `provider: "CLOUDINARY"`, `publicId`.

**Legacy:** старые URL без `publicId` при удалении из формы **не** вызывают Cloudinary destroy (удаляется только ссылка в сущности).

## Frontend

- **Админка:** `ImageUploadField` бьёт в `POST .../admin/media/images`, в форму сохраняется только `url`. `VenueEdit` → вкладка «Фотогалерея» использует `ImageGalleryManager`.
- **Мастер события (admin + supplier):** `EventWizard` принимает `mediaUpload` (`MediaUploadAdapter`); шаг «Медиа» в `EventBasicsStep` переключается на загрузку, если адаптер передан.
- **Supplier:** `createSupplierMediaUploadAdapter()` в `src/lib/media-api.ts`; устаревший `ImageUploadInput` переведён на новый URL (для остальных экранов).

## Проверка вручную (smoke)

1. Задать Cloudinary env, перезапустить API.
2. Админ: событие → мастер → загрузить обложку и несколько фото галереи → сохранить → перезайти — URL на месте.
3. Админ: площадка → галерея — drag reorder, удаление, повторное сохранение.
4. Поставщик: редактирование события — те же действия в мастере.
5. Убедиться, что публичные страницы открывают картинки по сохранённым URL.

## Фазы 0–12 (статус внедрения)

| Фаза | Содержание | Статус |
|------|------------|--------|
| 0 | Аудит полей / форм / старый upload | Зафиксировано в этом документе |
| 1 | Выбор lightweight MVP (URL в текущих полях) | Принято |
| 2 | Backend `MediaModule`, Multer, Cloudinary | Готово |
| 3 | Prisma | Без миграций (MVP) |
| 4–5 | Shared UI + типы + API-клиенты | Готово |
| 6 | Admin: EventEdit (мастер), VenueEdit (галерея), `ImageUploadField` | Готово |
| 7 | Supplier: мастер + `media-api` | Готово |
| 8 | Legacy URL без `publicId` | Поддержано (без cloud delete) |
| 9 | MIME / размер / лимит файлов | В `MediaService` + env |
| 10 | Документация, Tasktracker, Diary | Готово |
| 11 | Критерии приёмки | См. smoke ниже + автотесты |
| 12 | Отчёт для релиза | Сводка в конце README-плана в Tasktracker / PR |

## Автотесты

- Backend (Vitest): `packages/backend/src/media/__tests__/media.service.spec.ts` — валидация файлов, лимиты, `uploadImages` / `deleteByPublicIds` с моком `CloudinaryMediaService`.
- Точечный запуск: `cd packages/backend && npx vitest run src/media/__tests__/media.service.spec.ts`
- Полный `pnpm test` в backend может включать несвязанные падающие спеки в других модулях; для регресса медиа достаточно файла выше.

## Что осталось (future)

- Нормализованная таблица медиа и связи с сущностями.
- Удаление «сирот» в Cloudinary (фоновая задача).
- Полная интеграция в Article/Collection/Tag hero без ручного URL.
- Расширение `contentTemplateData` для явных полей изображений без правки JSON вручную.
