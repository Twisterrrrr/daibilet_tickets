/**
 * JSON-LD schema для SEO (Organization, Event, Place и т.д.)
 * Server component — данные формируются на сервере.
 */

interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  if (!data || Object.keys(data).length === 0) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** Базовый Organization для layout */
export function buildOrganizationSchema(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Дайбилет',
    url: siteUrl,
  };
}
