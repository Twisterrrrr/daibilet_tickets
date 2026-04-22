import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/shared/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium leading-none',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-muted text-foreground',
        success: 'border-transparent bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
        warning: 'border-transparent bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
        danger: 'border-transparent bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200',
        info: 'border-transparent bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200',
        outline: 'bg-background text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

