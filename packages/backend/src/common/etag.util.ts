import { createHash } from 'crypto';

export function stableJson(value: unknown): string {
  // Для DTO Next/Nest достаточно стандартной сериализации, порядок ключей стабилен.
  return JSON.stringify(value);
}

export function makeEtag(dto: unknown): string {
  const json = stableJson(dto);
  const hash = createHash('sha1').update(json).digest('base64url');
  return `W/"${hash}"`;
}

