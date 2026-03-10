import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export interface FormSectionProps {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
}

export function FormSection({ title, description, children, aside, className }: FormSectionProps) {
  return (
    <section className={clsx('rounded-xl border bg-white px-4 py-4 sm:px-6 sm:py-5', className)}>
      {(title || description || aside) && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title ? <h2 className="text-sm font-semibold leading-none text-slate-900">{title}</h2> : null}
            {description ? (
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">{description}</p>
            ) : null}
          </div>
          {aside ? <div className="text-xs text-slate-500 sm:text-sm">{aside}</div> : null}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

