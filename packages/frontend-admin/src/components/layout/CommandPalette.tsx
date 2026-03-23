import { Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ALL_NAV_ITEMS } from '@/config/nav';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);

  const filtered = useMemo(() => {
    const q = normalize(query).trim();
    if (!q) return ALL_NAV_ITEMS;
    return ALL_NAV_ITEMS.filter(
      (item) =>
        normalize(item.label).includes(q) || normalize(item.section).includes(q)
    );
  }, [query]);

  const select = useCallback(
    (item: (typeof ALL_NAV_ITEMS)[0]) => {
      navigate(item.to);
      onOpenChange(false);
      setQuery('');
      setSelected(0);
    },
    [navigate, onOpenChange]
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
    }
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === 'Enter' && filtered[selected]) {
        e.preventDefault();
        select(filtered[selected]);
      } else if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, filtered, selected, select, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gap-0 overflow-hidden p-0 sm:max-w-[420px]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              placeholder="Поиск раздела..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0"
              autoFocus
            />
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[min(60vh,400px)]">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Ничего не найдено
            </div>
          ) : (
            <div className="py-1">
              {filtered.map((item, idx) => (
                <button
                  key={`${item.to}-${idx}`}
                  type="button"
                  onClick={() => select(item)}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors',
                    idx === selected
                      ? 'bg-accent'
                      : 'hover:bg-accent/50'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 font-medium">{item.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.section}
                  </span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="flex items-center gap-2 border-t px-4 py-2 text-xs text-muted-foreground">
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">↑</kbd>
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">↓</kbd>
          <span>навигация</span>
          <span className="mx-1">·</span>
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">Enter</kbd>
          <span>выбрать</span>
          <span className="mx-1">·</span>
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">Esc</kbd>
          <span>закрыть</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CommandPaletteTrigger({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn('gap-2 text-muted-foreground', className)}
      title="Быстрый переход (Ctrl+K)"
    >
      <Search className="h-4 w-4" />
      <span className="hidden sm:inline">Поиск</span>
      <kbd className="hidden rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] sm:inline">
        Ctrl+K
      </kbd>
    </Button>
  );
}
