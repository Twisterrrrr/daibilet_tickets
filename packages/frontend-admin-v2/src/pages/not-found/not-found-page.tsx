import { FileQuestion, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '@/shared/lib/cn';
import { PageContainer } from '@/shared/ui/page-container';
import { buttonVariants } from '@/shared/ui/button';
import { PageGlyph } from '@/shared/ui/page-glyph';

export function NotFoundPage() {
  return (
    <PageContainer className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <PageGlyph icon={FileQuestion} tone="rose" className="mb-4" />
      <p className="text-label text-text-muted">404</p>
      <h1 className="mt-2 text-h1 text-text-primary">Страница не найдена</h1>
      <p className="mt-3 max-w-md text-body text-text-secondary">
        Маршрут не существует в этом макете. Проверьте ссылку или вернитесь на обзор.
      </p>
      <Link
        to="/dashboard"
        className={cn(buttonVariants({ variant: 'primary', size: 'md' }), 'mt-8 inline-flex items-center gap-2 no-underline')}
      >
        <Home className="h-4 w-4" aria-hidden />
        На dashboard
      </Link>
    </PageContainer>
  );
}
