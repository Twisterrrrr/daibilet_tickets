import { describe, expect, it } from 'vitest';

import { getCanonicalLandingTags } from '../canonical-tag-enrichment';

/** Helper: check Set contains tag */
const hasTag = (tags: Set<string>, tag: string) => tags.has(tag);

describe('getCanonicalLandingTags', () => {
  describe('saint-petersburg / nochnye-mosty', () => {
    it('assigns nochnye-mosty for bridge-opening night excursion in SPb', () => {
      const tags = getCanonicalLandingTags(
        'Ночная прогулка на развод мостов',
        'Теплоходная экскурсия по Неве с просмотром развода мостов',
        'saint-petersburg',
      );
      expect(hasTag(tags, 'nochnye-mosty')).toBe(true);
    });

    it('assigns nochnye-mosty for phrasing "под разведенными мостами" in SPb', () => {
      const tags = getCanonicalLandingTags(
        'Ночная экскурсия под разведенными мостами',
        'Прогулка на теплоходе по Неве под разведенными мостами',
        'saint-petersburg',
      );
      expect(hasTag(tags, 'nochnye-mosty')).toBe(true);
    });

    it('assigns nochnye-mosty for "ночные мосты" phrasing in SPb', () => {
      const tags = getCanonicalLandingTags(
        'Ночные мосты Петербурга',
        'Прогулка по Неве на теплоходе',
        'saint-petersburg',
      );
      expect(hasTag(tags, 'nochnye-mosty')).toBe(true);
    });

    it('does not assign nochnye-mosty for generic night excursion without bridge intent', () => {
      const tags = getCanonicalLandingTags(
        'Ночная прогулка по Неве',
        'Романтический вечерний круиз с музыкой',
        'saint-petersburg',
      );
      expect(hasTag(tags, 'nochnye-mosty')).toBe(false);
    });

    it('does not assign nochnye-mosty outside SPb', () => {
      const tags = getCanonicalLandingTags(
        'Ночная прогулка на развод мостов',
        'Речная экскурсия',
        'moscow',
      );
      expect(hasTag(tags, 'nochnye-mosty')).toBe(false);
    });
  });

  describe('cross-city / salyut-s-vody', () => {
    it('assigns salyut-s-vody for fireworks event from any city', () => {
      const tags = getCanonicalLandingTags(
        'Салют с борта теплохода',
        'Праздничная прогулка по реке с просмотром фейерверка',
        'moscow',
      );
      expect(hasTag(tags, 'salyut-s-vody')).toBe(true);
    });

    it('assigns salyut-s-vody for 9 may phrasing', () => {
      const tags = getCanonicalLandingTags(
        'Прогулка на 9 мая по реке',
        'С воды открывается лучший вид на салют',
        'saint-petersburg',
      );
      expect(hasTag(tags, 'salyut-s-vody')).toBe(true);
    });

    it('does not assign salyut-s-vody for festive wording without fireworks intent', () => {
      const tags = getCanonicalLandingTags(
        'Праздничный ужин на теплоходе',
        'Живая музыка и вечерняя прогулка',
        'moscow',
      );
      expect(hasTag(tags, 'salyut-s-vody')).toBe(false);
    });
  });

  describe('saint-petersburg / meteor-petergof', () => {
    it('assigns meteor-petergof for meteor to Petergof', () => {
      const tags = getCanonicalLandingTags(
        'Метеор в Петергоф',
        'Быстрый путь в Петергоф по воде',
        'saint-petersburg',
      );
      expect(hasTag(tags, 'meteor-petergof')).toBe(true);
    });

    it('does not assign meteor-petergof for generic Petergof excursion without meteor', () => {
      const tags = getCanonicalLandingTags(
        'Экскурсия в Петергоф',
        'Автобусная поездка с гидом',
        'saint-petersburg',
      );
      expect(hasTag(tags, 'meteor-petergof')).toBe(false);
    });

    it('does not assign meteor-petergof outside SPb', () => {
      const tags = getCanonicalLandingTags(
        'Метеор в Петергоф',
        'Водная экскурсия',
        'moscow',
      );
      expect(hasTag(tags, 'meteor-petergof')).toBe(false);
    });
  });

  describe('moscow / rechnye-progulki-msk', () => {
    it('assigns rechnye-progulki-msk for Moscow river cruise', () => {
      const tags = getCanonicalLandingTags(
        'Речная прогулка по Москве-реке',
        'Теплоходная экскурсия по центру Москвы',
        'moscow',
      );
      expect(hasTag(tags, 'rechnye-progulki-msk')).toBe(true);
    });

    it('assigns rechnye-progulki-msk for теплоход + Москва context', () => {
      const tags = getCanonicalLandingTags(
        'Прогулка на теплоходе по центру',
        'Маршрут по Москве-реке с видами на Кремль',
        'moscow',
      );
      expect(hasTag(tags, 'rechnye-progulki-msk')).toBe(true);
    });

    it('does not assign rechnye-progulki-msk for non-Moscow river cruise', () => {
      const tags = getCanonicalLandingTags(
        'Речная прогулка по Волге',
        'Прогулка на теплоходе',
        'samara',
      );
      expect(hasTag(tags, 'rechnye-progulki-msk')).toBe(false);
    });
  });

  describe('kazan / sviyazhsk', () => {
    it('assigns sviyazhsk for excursion to Sviyazhsk in Kazan', () => {
      const tags = getCanonicalLandingTags(
        'Экскурсия на Свияжск',
        'Поездка на остров-град с гидом',
        'kazan',
      );
      expect(hasTag(tags, 'sviyazhsk')).toBe(true);
    });

    it('assigns sviyazhsk for "остров-град" wording', () => {
      const tags = getCanonicalLandingTags(
        'Остров-град Свияжск',
        'Экскурсия из Казани',
        'kazan',
      );
      expect(hasTag(tags, 'sviyazhsk')).toBe(true);
    });

    it('does not assign sviyazhsk outside Kazan', () => {
      const tags = getCanonicalLandingTags(
        'Экскурсия на Свияжск',
        'Поездка с гидом',
        'moscow',
      );
      expect(hasTag(tags, 'sviyazhsk')).toBe(false);
    });
  });

  describe('vladimir / zolotye-vorota-vlad', () => {
    it('assigns zolotye-vorota-vlad for Golden Gate in Vladimir', () => {
      const tags = getCanonicalLandingTags(
        'Золотые ворота Владимира',
        'Экскурсия по белокаменным соборам',
        'vladimir',
      );
      expect(hasTag(tags, 'zolotye-vorota-vlad')).toBe(true);
    });

    it('assigns zolotye-vorota-vlad for Uspensky cathedral phrasing', () => {
      const tags = getCanonicalLandingTags(
        'Успенский собор и Дмитриевский собор',
        'Историческая прогулка по Владимиру',
        'vladimir',
      );
      expect(hasTag(tags, 'zolotye-vorota-vlad')).toBe(true);
    });
  });

  describe('yaroslavl / strelka-yaroslavl', () => {
    it('assigns strelka-yaroslavl for Strelka', () => {
      const tags = getCanonicalLandingTags(
        'Стрелка Ярославля',
        'Прогулка по набережной у слияния рек',
        'yaroslavl',
      );
      expect(hasTag(tags, 'strelka-yaroslavl')).toBe(true);
    });

    it('assigns strelka-yaroslavl for Kotorosl phrasing', () => {
      const tags = getCanonicalLandingTags(
        'Набережная Которосли и Стрелка',
        'Обзорная экскурсия',
        'yaroslavl',
      );
      expect(hasTag(tags, 'strelka-yaroslavl')).toBe(true);
    });
  });

  describe('kaliningrad / kurshskaya-kosa', () => {
    it('assigns kurshskaya-kosa for Curonian Spit', () => {
      const tags = getCanonicalLandingTags(
        'Экскурсия на Куршскую косу',
        'Танцующий лес и дюны',
        'kaliningrad',
      );
      expect(hasTag(tags, 'kurshskaya-kosa')).toBe(true);
    });

    it('assigns kurshskaya-kosa for "танцующий лес"', () => {
      const tags = getCanonicalLandingTags(
        'Танцующий лес и высота Эфа',
        'Однодневная экскурсия',
        'kaliningrad',
      );
      expect(hasTag(tags, 'kurshskaya-kosa')).toBe(true);
    });
  });

  describe('nizhny-novgorod / progulki-volga-nn', () => {
    it('assigns progulki-volga-nn for Volga cruise in Nizhny Novgorod', () => {
      const tags = getCanonicalLandingTags(
        'Прогулка по Волге на теплоходе',
        'Нижегородская набережная и виды на город',
        'nizhny-novgorod',
      );
      expect(hasTag(tags, 'progulki-volga-nn')).toBe(true);
    });

    it('does not assign progulki-volga-nn for Volga cruise in another city', () => {
      const tags = getCanonicalLandingTags(
        'Прогулка по Волге на теплоходе',
        'Самарская набережная',
        'samara',
      );
      expect(hasTag(tags, 'progulki-volga-nn')).toBe(false);
    });
  });

  describe('general behavior', () => {
    it('returns empty set for unrelated event', () => {
      const tags = getCanonicalLandingTags(
        'Музейная экскурсия для школьников',
        'Посещение постоянной экспозиции',
        'saint-petersburg',
      );
      expect(tags.size).toBe(0);
    });

    it('returns unique tags only', () => {
      const tags = getCanonicalLandingTags(
        'Салют и фейерверк с воды на 9 мая',
        'Фейерверк, салют, салют с теплохода',
        'moscow',
      );
      expect(new Set(tags).size).toBe(tags.size);
    });

    it('assigns multiple tags when event matches multiple themes', () => {
      const tags = getCanonicalLandingTags(
        'Салют с борта теплохода на развод мостов',
        'Ночная прогулка по Неве с видом на развод мостов и праздничный фейерверк',
        'saint-petersburg',
      );
      expect(hasTag(tags, 'salyut-s-vody')).toBe(true);
      expect(hasTag(tags, 'nochnye-mosty')).toBe(true);
    });
  });

  describe('negative cases', () => {
    it.each([
      ['Ночная прогулка по Неве', 'Романтический вечер', 'saint-petersburg'],
      ['Вечерний круиз с ужином', 'Музыка и панорамы города', 'saint-petersburg'],
    ])('does not assign nochnye-mosty for generic night cruise: %s', (title, description, city) => {
      const tags = getCanonicalLandingTags(title, description, city);
      expect(hasTag(tags, 'nochnye-mosty')).toBe(false);
    });
  });
});
