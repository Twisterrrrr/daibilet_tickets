export type CityImageConfig = {
  /** Путь до hero-картинки города (фон страницы города), например /assets/images/cities/saint-petersburg/hero.webp */
  hero: string;
  /** Путь до картинки карточки города (список городов, блок «Города» на главной) */
  card: string;
  /** Источник стока: Unsplash / Pexels / Pixabay / Flickr / Burst / RuPixel / другое */
  source: string;
  /** Имя автора согласно требованиям стока */
  author: string;
  /** Текст лицензии, например "free commercial use" или конкретная формулировка CC */
  license: string;
  /** Необязательный blur placeholder (data:image/webp;base64,...) для Next Image */
  blurDataUrl?: string;
};

/**
 * Единственная точка правды для путей до статичных изображений городов.
 * Фактические файлы лежат в public/assets/images/cities/{slug}/{hero,card}.webp.
 *
 * ВНИМАНИЕ: значения по умолчанию — заглушки. После подбора стоковых фото
 * нужно:
 * 1) создать файлы по указанным путям;
 * 2) заполнить source/author/license;
 * 3) при необходимости сгенерировать blurDataUrl через скрипт оптимизации.
 */
export const CITY_IMAGES: Record<string, CityImageConfig> = {
  'saint-petersburg': {
    hero: '/assets/images/cities/saint-petersburg/hero.webp',
    card: '/assets/images/cities/saint-petersburg/card.webp',
    source: '',
    author: '',
    license: 'free commercial use',
  },
  moscow: {
    hero: '/assets/images/cities/moscow/hero.webp',
    card: '/assets/images/cities/moscow/card.webp',
    source: '',
    author: '',
    license: 'free commercial use',
  },
  kazan: {
    hero: '/assets/images/cities/kazan/hero.webp',
    card: '/assets/images/cities/kazan/card.webp',
    source: '',
    author: '',
    license: 'free commercial use',
  },
  kaliningrad: {
    hero: '/assets/images/cities/kaliningrad/hero.webp',
    card: '/assets/images/cities/kaliningrad/card.webp',
    source: '',
    author: '',
    license: 'free commercial use',
  },
  vladimir: {
    hero: '/assets/images/cities/vladimir/hero.webp',
    card: '/assets/images/cities/vladimir/card.webp',
    source: '',
    author: '',
    license: 'free commercial use',
  },
  yaroslavl: {
    hero: '/assets/images/cities/yaroslavl/hero.webp',
    card: '/assets/images/cities/yaroslavl/card.webp',
    source: '',
    author: '',
    license: 'free commercial use',
  },
  ekaterinburg: {
    hero: '/assets/images/cities/ekaterinburg/hero.webp',
    card: '/assets/images/cities/ekaterinburg/card.webp',
    source: '',
    author: '',
    license: 'free commercial use',
  },
  'nizhny-novgorod': {
    hero: '/assets/images/cities/nizhny-novgorod/hero.webp',
    card: '/assets/images/cities/nizhny-novgorod/card.webp',
    source: '',
    author: '',
    license: 'free commercial use',
  },
  novosibirsk: {
    hero: '/assets/images/cities/novosibirsk/hero.webp',
    card: '/assets/images/cities/novosibirsk/card.webp',
    source: '',
    author: '',
    license: 'free commercial use',
  },
  krasnoyarsk: {
    hero: '/assets/images/cities/krasnoyarsk/hero.webp',
    card: '/assets/images/cities/krasnoyarsk/card.webp',
    source: '',
    author: '',
    license: 'free commercial use',
  },
  ivanovo: {
    hero: '/assets/images/cities/ivanovo/hero.webp',
    card: '/assets/images/cities/ivanovo/card.webp',
    source: '',
    author: '',
    license: 'free commercial use',
  },
  tula: {
    hero: '/assets/images/cities/tula/hero.webp',
    card: '/assets/images/cities/tula/card.webp',
    source: '',
    author: '',
    license: 'free commercial use',
  },
  orenburg: {
    hero: '/assets/images/cities/orenburg/hero.webp',
    card: '/assets/images/cities/orenburg/card.webp',
    source: '',
    author: '',
    license: 'free commercial use',
  },
  samara: {
    hero: '/assets/images/cities/samara/hero.webp',
    card: '/assets/images/cities/samara/card.webp',
    source: '',
    author: '',
    license: 'free commercial use',
  },
  omsk: {
    hero: '/assets/images/cities/omsk/hero.webp',
    card: '/assets/images/cities/omsk/card.webp',
    source: '',
    author: '',
    license: 'free commercial use',
  },
  ufa: {
    hero: '/assets/images/cities/ufa/hero.webp',
    card: '/assets/images/cities/ufa/card.webp',
    source: '',
    author: '',
    license: 'free commercial use',
  },
  pskov: {
    hero: '/assets/images/cities/pskov/hero.webp',
    card: '/assets/images/cities/pskov/card.webp',
    source: '',
    author: '',
    license: 'free commercial use',
  },
  'veliky-novgorod': {
    hero: '/assets/images/cities/veliky-novgorod/hero.webp',
    card: '/assets/images/cities/veliky-novgorod/card.webp',
    source: '',
    author: '',
    license: 'free commercial use',
  },
  tver: {
    hero: '/assets/images/cities/tver/hero.webp',
    card: '/assets/images/cities/tver/card.webp',
    source: '',
    author: '',
    license: 'free commercial use',
  },
  krasnodar: {
    hero: '/assets/images/cities/krasnodar/hero.webp',
    card: '/assets/images/cities/krasnodar/card.webp',
    source: '',
    author: '',
    license: 'free commercial use',
  },
  tyumen: {
    hero: '/assets/images/cities/tyumen/hero.webp',
    card: '/assets/images/cities/tyumen/card.webp',
    source: '',
    author: '',
    license: 'free commercial use',
  },
  voronezh: {
    hero: '/assets/images/cities/voronezh/hero.webp',
    card: '/assets/images/cities/voronezh/card.webp',
    source: '',
    author: '',
    license: 'free commercial use',
  },
  ryazan: {
    hero: '/assets/images/cities/ryazan/hero.webp',
    card: '/assets/images/cities/ryazan/card.webp',
    source: '',
    author: '',
    license: 'free commercial use',
  },
  dimitrovgrad: {
    hero: '/assets/images/cities/dimitrovgrad/hero.webp',
    card: '/assets/images/cities/dimitrovgrad/card.webp',
    source: '',
    author: '',
    license: 'free commercial use',
  },
  kirov: {
    hero: '/assets/images/cities/kirov/hero.webp',
    card: '/assets/images/cities/kirov/card.webp',
    source: '',
    author: '',
    license: 'free commercial use',
  },
  'rostov-na-donu': {
    hero: '/assets/images/cities/rostov-na-donu/hero.webp',
    card: '/assets/images/cities/rostov-na-donu/card.webp',
    source: '',
    author: '',
    license: 'free commercial use',
  },
  novokuznetsk: {
    hero: '/assets/images/cities/novokuznetsk/hero.webp',
    card: '/assets/images/cities/novokuznetsk/card.webp',
    source: '',
    author: '',
    license: 'free commercial use',
  },
  tomsk: {
    hero: '/assets/images/cities/tomsk/hero.webp',
    card: '/assets/images/cities/tomsk/card.webp',
    source: '',
    author: '',
    license: 'free commercial use',
  },
};

