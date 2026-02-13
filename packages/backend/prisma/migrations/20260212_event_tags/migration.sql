-- Seed special event tags
INSERT INTO "tags" (id, slug, name, category, description, "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'bridges', 'Развод мостов', 'SPECIAL', 'Экскурсии на развод мостов в Санкт-Петербурге', true, NOW(), NOW()),
  (gen_random_uuid(), 'salute', 'Салюты', 'SPECIAL', 'Рейсы с видом на салют', true, NOW(), NOW()),
  (gen_random_uuid(), 'scarlet-sails', 'Алые паруса', 'SPECIAL', 'Программа на праздник Алые паруса', true, NOW(), NOW()),
  (gen_random_uuid(), 'new-year', 'Новый год', 'SEASON', 'Новогодние программы и события', true, NOW(), NOW()),
  (gen_random_uuid(), 'city-day', 'День города', 'SPECIAL', 'Программы ко Дню города', true, NOW(), NOW()),
  (gen_random_uuid(), 'white-nights', 'Белые ночи', 'SEASON', 'Экскурсии в период белых ночей', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;
