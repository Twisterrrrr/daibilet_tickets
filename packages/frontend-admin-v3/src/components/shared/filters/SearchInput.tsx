import { Input } from '@/components/ui/input';
import { cn } from '@/shared/lib/cn';
import { Search } from 'lucide-react';
import type { ComponentProps } from 'react';

export function SearchInput({ className, ...props }: ComponentProps<typeof Input>) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input className="pl-9" {...props} />
    </div>
  );
}

