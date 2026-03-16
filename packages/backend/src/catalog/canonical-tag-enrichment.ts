/**
 * Canonical tag enrichment для лендингов.
 * Добавляет теги на основе title/description, независимо от источника (TC, Teplohod).
 * Используется в retagAll — применяется ко всем активным событиям.
 *
 * @see docs/LandingTagsStrategy.md
 */

/** Правило: keyword (подстрока) → теги. citySlugs = только для этих городов (undefined = любой). */
interface EnrichmentRule {
  keywords: string[];
  tags: string[];
  citySlugs?: string[];
}

const LANDING_ENRICHMENT_RULES: EnrichmentRule[] = [
  // nochnye-mosty — СПб
  {
    keywords: [
      'развод мостов',
      'разводные мосты',
      'разводка мостов',
      'под разводными',
      'разведенными мостами',
      'разведёнными мостами',
      'под разведенными мостами',
      'под разведёнными мостами',
      'ночные мосты',
      'ночной мост',
      'прогулка на развод',
    ],
    tags: ['nochnye-mosty'],
    citySlugs: ['saint-petersburg'],
  },
  // salyut-s-vody — салют с воды (СПб, Москва и др.)
  {
    keywords: ['салют', 'фейерверк', 'день победы', '9 мая', 'салют с воды', 'с воды салют'],
    tags: ['salyut-s-vody'],
  },
  // meteor-petergof — СПб (только «метеор» — катер; «петергоф» без метеора = автобус)
  {
    keywords: ['метеор'],
    tags: ['meteor-petergof'],
    citySlugs: ['saint-petersburg'],
  },
  // rechnye-progulki-msk — Москва
  {
    keywords: [
      'речн',
      'теплоход',
      'москва-рек',
      'прогулк по реке',
      'прогулк по москве',
      'теплоход москва',
    ],
    tags: ['rechnye-progulki-msk'],
    citySlugs: ['moscow'],
  },
  // sviyazhsk — Казань
  {
    keywords: ['свияжск', 'остров-град'],
    tags: ['sviyazhsk'],
    citySlugs: ['kazan'],
  },
  // zolotye-vorota-vlad — Владимир
  {
    keywords: [
      'золотые ворота',
      'успенский собор',
      'дмитриевский собор',
    ],
    tags: ['zolotye-vorota-vlad'],
    citySlugs: ['vladimir'],
  },
  // strelka-yaroslavl — Ярославль
  {
    keywords: [
      'стрелка ярославл',
      'стрелка волг',
      'которосл',
      'спасо-преображенский',
    ],
    tags: ['strelka-yaroslavl'],
    citySlugs: ['yaroslavl'],
  },
  // kurshskaya-kosa — Калининград
  {
    keywords: ['куршск', 'танцующий лес', 'куршская коса'],
    tags: ['kurshskaya-kosa'],
    citySlugs: ['kaliningrad'],
  },
  // progulki-volga-nn — Нижний Новгород
  {
    keywords: [
      'нижегородск',
      'волга нижн',
      'нижний новгород',
      'прогулк по волге',
    ],
    tags: ['progulki-volga-nn'],
    citySlugs: ['nizhny-novgorod'],
  },
];

/**
 * Возвращает набор slug тегов для привязки к событию на основе title/description.
 * Учитывает citySlug для city-specific правил.
 */
export function getCanonicalLandingTags(
  title: string,
  description: string,
  citySlug?: string | null,
): Set<string> {
  const text = `${title || ''} ${description || ''}`.toLowerCase();
  const result = new Set<string>();

  for (const rule of LANDING_ENRICHMENT_RULES) {
    if (rule.citySlugs && citySlug && !rule.citySlugs.includes(citySlug)) {
      continue;
    }
    const matched = rule.keywords.some((kw) => text.includes(kw));
    if (matched) {
      for (const tag of rule.tags) {
        result.add(tag);
      }
    }
  }

  return result;
}
