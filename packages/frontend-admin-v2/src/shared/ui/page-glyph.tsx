import type { LucideIcon } from 'lucide-react';

import { cn } from '@/shared/lib/cn';

/** Пастельные фоны и приглушённые цвета иконок — без кричащих тонов */
const tones = {
  violet: 'bg-[hsl(262_42%_95%)] text-[hsl(262_32%_44%)] shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.7)]',
  sky: 'bg-[hsl(200_52%_93%)] text-[hsl(200_40%_38%)] shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.7)]',
  mint: 'bg-[hsl(158_42%_92%)] text-[hsl(158_38%_34%)] shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.7)]',
  peach: 'bg-[hsl(32_76%_93%)] text-[hsl(28_42%_40%)] shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.7)]',
  rose: 'bg-[hsl(330_38%_94%)] text-[hsl(330_36%_44%)] shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.7)]',
  amber: 'bg-[hsl(42_70%_92%)] text-[hsl(35_45%_38%)] shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.7)]',
  slate: 'bg-[hsl(220_28%_94%)] text-[hsl(220_22%_38%)] shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.7)]',
} as const;

export type PageGlyphTone = keyof typeof tones;

export function PageGlyph({
  icon: Icon,
  tone = 'sky',
  className,
}: {
  icon: LucideIcon;
  tone?: PageGlyphTone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-2xl sm:h-16 sm:w-16',
        tones[tone],
        className,
      )}
      aria-hidden
    >
      <Icon className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={1.75} />
    </div>
  );
}
