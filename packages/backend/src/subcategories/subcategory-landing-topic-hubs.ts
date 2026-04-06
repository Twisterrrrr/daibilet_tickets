/**
 * Маппинг landingTopicKey → канонический путь тематического хаба (сегмент города).
 * Не генерировать параллельные `/cities/.../{subcategorySlug}` для TOPIC_HUB.
 */
export function topicHubRedirectPath(topicKey: string | null | undefined, citySlug: string): string | null {
  const k = topicKey?.trim();
  if (!k) return null;
  if (k === 'river-cruises') return `/river-cruises/${citySlug}`;
  return null;
}
