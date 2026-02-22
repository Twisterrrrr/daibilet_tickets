/**
 * PII Masking — маскирование персональных данных в логах и error context.
 * Используется для email, phone, authorization, cookie, token, apiKey.
 */

const MASK = '***';

/**
 * Маскирует email: user@domain.com → u***@d***.com
 */
export function maskEmail(s: string | null | undefined): string {
  if (!s || typeof s !== 'string') return '';
  const at = s.indexOf('@');
  if (at <= 0) return MASK;
  const local = s.slice(0, at);
  const domain = s.slice(at + 1);
  const maskedLocal = local.length <= 2 ? MASK : local[0] + MASK + local[local.length - 1];
  const dot = domain.lastIndexOf('.');
  const maskedDomain = dot <= 0 ? MASK : domain.slice(0, Math.min(2, domain.indexOf('.'))) + MASK + domain.slice(dot);
  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * Маскирует телефон: оставляет последние 2 цифры
 */
export function maskPhone(s: string | null | undefined): string {
  if (!s || typeof s !== 'string') return '';
  const digits = s.replace(/\D/g, '');
  if (digits.length < 4) return MASK;
  return MASK + digits.slice(-2);
}

/**
 * Маскирует токен/пароль/секрет: полностью скрывает
 */
export function maskSecret(s: string | null | undefined): string {
  if (!s || typeof s !== 'string') return '';
  if (s.length <= 4) return MASK;
  return s.slice(0, 2) + MASK + s.slice(-1);
}

/**
 * Маскирует заголовок Authorization: Bearer xxx → Bearer ***
 */
export function maskAuthorization(s: string | null | undefined): string {
  if (!s || typeof s !== 'string') return '';
  if (s.toLowerCase().startsWith('bearer ')) return 'Bearer ' + MASK;
  if (s.toLowerCase().startsWith('basic ')) return 'Basic ' + MASK;
  return MASK;
}

/**
 * Маскирует объект/строку, заменяя известные PII-поля
 */
export function maskPii(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return maskSecret(obj);

  if (typeof obj !== 'object') return obj;

  const out: Record<string, unknown> = {};
  const piiKeys = [
    'email',
    'phone',
    'password',
    'token',
    'apiKey',
    'api_key',
    'authorization',
    'cookie',
    'cookies',
    'secret',
    'accessToken',
    'refreshToken',
  ];

  for (const [k, v] of Object.entries(obj)) {
    const keyLower = k.toLowerCase();
    if (piiKeys.some((p) => keyLower.includes(p.toLowerCase()))) {
      if (keyLower.includes('email')) out[k] = maskEmail(String(v));
      else if (keyLower.includes('phone')) out[k] = maskPhone(String(v));
      else if (keyLower.includes('authorization')) out[k] = maskAuthorization(String(v));
      else out[k] = MASK;
    } else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = maskPii(v) as object;
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Маскирует строку сообщения: ищет паттерны email, phone и подставляет маски
 */
export function maskPiiInString(s: string | null | undefined): string {
  if (!s || typeof s !== 'string') return '';
  // Email: простой паттерн
  let out = s.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, (m) => maskEmail(m) || MASK);
  // Телефон: 10-11 цифр подряд
  out = out.replace(/(\+?\d[\d\s-]{8,}\d)/g, (m) => maskPhone(m) || MASK);
  return out;
}
