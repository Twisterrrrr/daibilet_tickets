/** Сумма в рублях и копейках прописью (счета, акты). Диапазон рублей: 0 … 999 млрд. */

function plural(n: number, forms: [string, string, string]): string {
  const m = n % 100;
  const m1 = n % 10;
  if (m >= 11 && m <= 14) return forms[2];
  if (m1 === 1) return forms[0];
  if (m1 >= 2 && m1 <= 4) return forms[1];
  return forms[2];
}

function capitalize(s: string): string {
  const t = s.trim();
  if (!t) return t;
  return t[0].toUpperCase() + t.slice(1);
}

/** Триада 0…999, female=true для разряда тысяч (1→одна, 2→две) */
function triad(n: number, female: boolean): string {
  if (n === 0) return '';
  const h = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
  const t = [
    '',
    '',
    'двадцать',
    'тридцать',
    'сорок',
    'пятьдесят',
    'шестьдесят',
    'семьдесят',
    'восемьдесят',
    'девяносто',
  ];
  const oMale = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
  const oFem = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
  const teen = [
    'десять',
    'одиннадцать',
    'двенадцать',
    'тринадцать',
    'четырнадцать',
    'пятнадцать',
    'шестнадцать',
    'семнадцать',
    'восемнадцать',
    'девятнадцать',
  ];
  const hun = Math.floor(n / 100);
  const te = Math.floor((n % 100) / 10);
  const one = n % 10;
  const ones = female ? oFem : oMale;
  const parts: string[] = [];
  if (hun) parts.push(h[hun]!);
  if (te === 1) parts.push(teen[one]!);
  else {
    if (te > 1) parts.push(t[te]!);
    if (one) parts.push(ones[one]!);
  }
  return parts.join(' ');
}

function scales(n: number): string {
  if (n === 0) return 'ноль';
  let rest = n;
  const out: string[] = [];

  const billions = Math.floor(rest / 1_000_000_000);
  if (billions) {
    out.push(`${triad(billions, false)} ${plural(billions, ['миллиард', 'миллиарда', 'миллиардов'])}`);
    rest %= 1_000_000_000;
  }
  const millions = Math.floor(rest / 1_000_000);
  if (millions) {
    out.push(`${triad(millions, false)} ${plural(millions, ['миллион', 'миллиона', 'миллионов'])}`);
    rest %= 1_000_000;
  }
  const thousands = Math.floor(rest / 1000);
  if (thousands) {
    out.push(`${triad(thousands, true)} ${plural(thousands, ['тысяча', 'тысячи', 'тысяч'])}`);
    rest %= 1000;
  }
  if (rest) out.push(triad(rest, false));
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Напр. 8000.00 → «Восемь тысяч рублей 00 копеек»
 */
export function rublesToWords(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return '—';
  const kopecksRounded = Math.round(amount * 100);
  const rub = Math.floor(kopecksRounded / 100);
  const kop = kopecksRounded % 100;
  if (rub === 0 && kop === 0) return 'Ноль рублей 00 копеек';
  const rubW = scales(rub);
  const rubEnd = plural(rub, ['рубль', 'рубля', 'рублей']);
  const kopEnd = plural(kop, ['копейка', 'копейки', 'копеек']);
  if (rub === 0) {
    return `Ноль рублей ${String(kop).padStart(2, '0')} ${kopEnd}`;
  }
  return `${capitalize(rubW)} ${rubEnd} ${String(kop).padStart(2, '0')} ${kopEnd}`;
}
