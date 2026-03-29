import {
  createContext,
  useContext,
  useId,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';

import { cn } from '@/shared/lib/cn';

interface TabsContextValue {
  value: string;
  setValue: (v: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs components must be used within <Tabs>');
  return ctx;
}

export function Tabs({
  value: valueProp,
  defaultValue = '',
  onValueChange,
  children,
  className,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  children: ReactNode;
  className?: string;
}) {
  const baseId = useId();
  const [internal, setInternal] = useState(defaultValue);
  const isControlled = valueProp !== undefined;
  const value = isControlled ? valueProp : internal;

  const setValue = (v: string) => {
    if (!isControlled) setInternal(v);
    onValueChange?.(v);
  };

  const ctx = useMemo(() => ({ value, setValue, baseId }), [value, setValue, baseId]);

  return (
    <TabsContext.Provider value={ctx}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex min-h-[3rem] flex-wrap gap-2 rounded-2xl bg-[hsl(var(--bg-surface-alt)_/_0.85)] p-2 shadow-[inset_0_1px_2px_hsl(220_20%_30%_/_0.06)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  className,
  children,
  ...rest
}: { value: string; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const { value: current, setValue, baseId } = useTabsContext();
  const isSelected = current === value;

  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={isSelected}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={isSelected ? 0 : -1}
      onClick={() => setValue(value)}
      className={cn(
        'flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 px-5 py-2.5 text-[calc(0.8125rem+2px)] font-bold leading-snug transition-[background-color,border-color,color,box-shadow]',
        'text-text-secondary',
        'hover:border-border-soft hover:bg-surface hover:text-text-primary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-page',
        isSelected &&
          'border-accent/40 bg-surface text-accent shadow-sm shadow-[0_1px_3px_hsl(220_24%_35%_/_0.08)]',
        !isSelected && 'border-transparent bg-transparent',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: ReactNode;
}) {
  const { value: current, baseId } = useTabsContext();
  if (current !== value) return null;

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      className={cn('pt-6', className)}
    >
      {children}
    </div>
  );
}
