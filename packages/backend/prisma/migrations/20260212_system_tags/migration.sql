-- Seed system tags for filtering, badges and ranking
INSERT INTO "tags" (id, slug, name, category, description, "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'night', 'Ночная', 'THEME', 'Ночные экскурсии и мероприятия', true, NOW(), NOW()),
  (gen_random_uuid(), 'water', 'На воде', 'THEME', 'Водные экскурсии и прогулки', true, NOW(), NOW()),
  (gen_random_uuid(), 'romantic', 'Романтика', 'THEME', 'Романтические экскурсии и мероприятия', true, NOW(), NOW()),
  (gen_random_uuid(), 'best-value', 'Лучшая цена', 'SPECIAL', 'Лучшее соотношение цена/время', true, NOW(), NOW()),
  (gen_random_uuid(), 'last-minute', 'Последний шанс', 'SPECIAL', 'Мало мест или скоро начало', true, NOW(), NOW()),
  (gen_random_uuid(), 'today-available', 'Есть на сегодня', 'SPECIAL', 'Доступно для посещения сегодня', true, NOW(), NOW()),
  (gen_random_uuid(), 'bad-weather-ok', 'В любую погоду', 'THEME', 'Подходит при плохой погоде (закрытое помещение)', true, NOW(), NOW()),
  (gen_random_uuid(), 'first-time-city', 'Для первого визита', 'AUDIENCE', 'Рекомендуется при первом посещении города', true, NOW(), NOW()),
  (gen_random_uuid(), 'with-guide', 'С гидом', 'THEME', 'Экскурсия с живым гидом', true, NOW(), NOW()),
  (gen_random_uuid(), 'no-queue', 'Без очереди', 'SPECIAL', 'Проход без очереди', true, NOW(), NOW()),
  (gen_random_uuid(), 'interactive', 'Интерактив', 'THEME', 'Интерактивный формат', true, NOW(), NOW()),
  (gen_random_uuid(), 'audioguide', 'Аудиогид', 'THEME', 'С аудиогидом', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;
