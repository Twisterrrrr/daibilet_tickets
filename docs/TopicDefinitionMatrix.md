# TopicDefinition Matrix

Используется системой автогенерации SEO-страниц (Auto Landing Engine).

**Правило отображения:** `visible = events(city, filterTag) >= minEvents`

Если событий меньше порога — лендинг скрыт (`isActive = false`).

## Города

### Санкт-Петербург
| slug | filterTag | minEvents |
|------|-----------|-----------|
| nochnye-mosty | nochnye-mosty | 2 |
| meteory | meteor-petergof | 3 |
| salyut | salyut-s-vody | 2 |

### Москва
| slug | filterTag | minEvents |
|------|-----------|-----------|
| rechnye-progulki | rechnye-progulki-msk | 3 |

### Казань
| slug | filterTag | minEvents |
|------|-----------|-----------|
| sviyazhsk | sviyazhsk | 2 |

### Нижний Новгород
| slug | filterTag | minEvents |
|------|-----------|-----------|
| progulki-po-volge | progulki-volga-nn | 3 |
| nizhegorodskij-kreml | kreml-nn | 2 |
| kanatnaya-doroga | kanatka-nn | 2 |

### Калининград, Ярославль, Владимир
| slug | filterTag | minEvents |
|------|-----------|-----------|
| kurshskaya-kosa | kurshskaya-kosa | 2 |
| strelka-i-volga | strelka-yaroslavl | 2 |
| zolotye-vorota | zolotye-vorota-vlad | 2 |

## Cross-city (Collections)
| slug | filterTags | minEvents |
|------|------------|-----------|
| salyut | salyut-s-vody | 3 |
