/**
 * Разбор текста писем с teplohod.info.
 * Входящие на ящик агента (напр. info@…) часто приходят **от** sale@teplohod.info.
 * Без внешних библиотек — только эвристики по тексту / простому .eml.
 */

export type TeplohodEmailKind = 'unknown' | 'order' | 'refund' | 'ticket_or_voucher';

/** Официальный адрес рассылок Teplohod (для фильтра в IMAP / проверки заголовка From). */
export const TEPLHOD_SALE_FROM = 'sale@teplohod.info';

/** Любой адрес на домене teplohod.info (sale@, bounce@smtp.… и т.д.). */
const RE_AT_TEPLHOD = /@\S*teplohod\.info\b/i;

export interface TeplohodParsedEmail {
  kind: TeplohodEmailKind;
  referenceIds: string[];
  amountsRub: number[];
  signals: string[];
  /** true, если в сыром письме виден From: sale@teplohod.info (или другой @teplohod.info) */
  fromTeplohodDomain?: boolean;
}

const RE_TEP_PREFIX = /\btep-[a-z0-9-]+\b/gi;
const RE_OBJECT_ID = /\b[0-9a-f]{24}\b/gi;
const RE_MONEY_RUB = /(\d[\d\s]*[,.]?\d*)\s*(?:₽|руб|RUB)/gi;

const RE_REFUND_WORDS = /(возврат|refund|отмен[аы]|отменен|отменён)/i;
const RE_ORDER_WORDS = /(заказ|билет|оплат|покупк|order|booking|брон)/i;
const RE_TICKET_WORDS = /(билет|ticket|qr|штрих|код)/i;

function uniq<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

function parseRubAmount(fullMatch: string): number | null {
  const inner = fullMatch
    .replace(/\s*(?:₽|руб|RUB)\s*$/i, '')
    .replace(/\s/g, '')
    .replace(',', '.');
  const n = parseFloat(inner);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

export function coalesceEmailBody(raw: string): string {
  const t = raw.trim();
  if (/^(From|Subject|Date|To|Delivered-To):/im.test(t)) {
    const idx = t.search(/\r?\n\r?\n/);
    if (idx >= 0) {
      return t.slice(idx + 2).trim();
    }
  }
  return t;
}

export function extractPlainFromSimpleEml(raw: string): string {
  const boundary = raw.match(/boundary="?([^";\s]+)"?/i)?.[1];
  if (!boundary) {
    return coalesceEmailBody(raw);
  }

  const esc = boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = raw.split(new RegExp(`\\r?\\n--${esc}`));
  for (const part of parts) {
    if (!/Content-Type:\s*text\/plain/i.test(part)) continue;
    const bodyStart = part.search(/\r?\n\r?\n/);
    if (bodyStart < 0) continue;
    let body = part.slice(bodyStart).replace(/^\s+/s, '').trim();
    if (/Content-Transfer-Encoding:\s*quoted-printable/im.test(part)) {
      body = decodeQuotedPrintableLight(body);
    }
    if (body.length > 0) return body;
  }

  return coalesceEmailBody(raw);
}

/**
 * Quoted-printable для UTF-8: последовательности =D0=9D… — это байты одной кодировки,
 * их нужно собрать и декодировать как UTF-8, а не как отдельные Latin-1 символы.
 */
function decodeQuotedPrintableLight(s: string): string {
  const noSoft = s.replace(/=\r?\n/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < noSoft.length; i++) {
    if (noSoft[i] === '=' && /^[0-9A-F]{2}$/i.test(noSoft.slice(i + 1, i + 3))) {
      bytes.push(parseInt(noSoft.slice(i + 1, i + 3), 16));
      i += 2;
      continue;
    }
    bytes.push(noSoft.charCodeAt(i) & 0xff);
  }
  return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
}

function guessKind(text: string): { kind: TeplohodEmailKind; signals: string[] } {
  const signals: string[] = [];
  let kind: TeplohodEmailKind = 'unknown';

  if (RE_REFUND_WORDS.test(text)) {
    kind = 'refund';
    signals.push('refund_keywords');
  } else if (RE_ORDER_WORDS.test(text)) {
    kind = 'order';
    signals.push('order_keywords');
  }

  if (RE_TICKET_WORDS.test(text)) {
    signals.push('ticket_keywords');
    if (kind === 'unknown') kind = 'ticket_or_voucher';
  }

  return { kind, signals };
}

/**
 * Проверка заголовков From / Return-Path / Sender на домен teplohod.info
 * (типичный отправитель рассылок — sale@teplohod.info).
 */
export function isFromTeplohodOfficial(raw: string): boolean {
  const head = raw.slice(0, 12000);
  const lines = head.split(/\r?\n/);
  for (const line of lines) {
    if (line === '' || line === '\r') break;
    if (/^(From|Return-Path|Sender|Reply-To):/i.test(line) && RE_AT_TEPLHOD.test(line)) {
      return true;
    }
  }
  return false;
}

/** Сырой .eml от MTA/ящика: первая строка часто Delivered-To, дальше Return-path, From, multipart. */
function looksLikeRawEml(raw: string): boolean {
  const head = raw.trimStart().slice(0, 16000);
  if (
    /^(From|Return-Path|Return-path|Delivered-To|MIME-Version|Subject|Received):/im.test(head)
  ) {
    return true;
  }
  return /boundary\s*=/i.test(head);
}

export function parseTeplohodIncomingEmail(raw: string): TeplohodParsedEmail {
  const text = looksLikeRawEml(raw) ? extractPlainFromSimpleEml(raw) : coalesceEmailBody(raw);

  const fromTeplohodDomain = isFromTeplohodOfficial(raw);

  const referenceIds: string[] = [];
  for (const re of [RE_TEP_PREFIX, RE_OBJECT_ID]) {
    const m = text.match(re);
    if (m) referenceIds.push(...m.map((x) => x.toLowerCase()));
  }

  const amountsRub: number[] = [];
  let m: RegExpExecArray | null;
  const reMoney = new RegExp(RE_MONEY_RUB.source, 'gi');
  while ((m = reMoney.exec(text)) !== null) {
    const rub = parseRubAmount(m[0]);
    if (rub != null) amountsRub.push(rub);
  }

  let { kind, signals } = guessKind(text);
  if (fromTeplohodDomain) {
    signals = uniq([...signals, 'sender_teplohod_domain']);
  }

  return {
    kind,
    referenceIds: uniq(referenceIds),
    amountsRub: uniq(amountsRub),
    signals,
    ...(fromTeplohodDomain ? { fromTeplohodDomain: true } : {}),
  };
}
