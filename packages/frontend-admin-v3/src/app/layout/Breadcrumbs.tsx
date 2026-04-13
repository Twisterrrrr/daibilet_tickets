import { navigationFlat } from '@/config/navigation';
import { cn } from '@/shared/lib/cn';
import { Link, useLocation } from 'react-router-dom';

function getLabel(pathname: string): string | null {
  const base = '/admin-v3/';
  const local = pathname.startsWith(base) ? pathname.slice(base.length) : pathname.replace(/^\//, '');
  const match = navigationFlat.find((i) => local === i.to || local.startsWith(`${i.to}/`));
  return match?.label ?? null;
}

export function Breadcrumbs({ className }: { className?: string }) {
  const { pathname } = useLocation();
  const label = getLabel(pathname);

  return (
    <div className={cn('flex min-w-0 items-center gap-2 text-sm text-muted-foreground', className)}>
      <Link to="/admin-v3/dashboard" className="hover:text-foreground">
        Админка
      </Link>
      {label ? <span className="text-muted-foreground/60">/</span> : null}
      {label ? <span className="min-w-0 truncate text-foreground">{label}</span> : null}
    </div>
  );
}

