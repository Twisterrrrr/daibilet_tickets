import { Card } from '@/components/ui/card';

export type LandingSeoTabProps = {
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
};

export function LandingSeoTab(props: LandingSeoTabProps) {
  const { metaTitle, metaDescription, canonicalUrl } = props;
  return (
    <Card className="border-border p-4">
      <div className="text-sm">
        <div className="font-semibold">SEO</div>
        <div className="mt-2 grid gap-2 text-xs text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">metaTitle:</span> {metaTitle?.trim() || '—'}
          </div>
          <div>
            <span className="font-medium text-foreground">metaDescription:</span> {metaDescription?.trim() || '—'}
          </div>
          <div>
            <span className="font-medium text-foreground">canonicalUrl:</span> {canonicalUrl?.trim() || '—'}
          </div>
        </div>
      </div>
    </Card>
  );
}

