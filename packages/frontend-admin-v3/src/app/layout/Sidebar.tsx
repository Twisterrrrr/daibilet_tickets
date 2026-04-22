import { navigation } from '@/config/navigation';
import { isFeatureEnabled } from '@/config/features';
import { useAdminInboxCount } from '@/hooks/useAdminInboxCount';
import { cn } from '@/shared/lib/cn';
import { NavLink } from 'react-router-dom';

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const inbox = useAdminInboxCount();
  const inboxTotal = inbox.data?.total ?? 0;
  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          'border-b border-sidebar-border px-3 pb-4 pt-5',
          collapsed ? 'flex justify-center px-2' : '',
        )}
      >
        <div className={cn('flex min-w-0 items-center gap-2', collapsed && 'justify-center')}>
          <div
            className="flex h-10 w-[3.35rem] shrink-0 items-center justify-center text-[hsl(50_96%_58%)]"
            aria-hidden
          >
            <svg
              className="block h-[calc(2.9rem*9/15)] w-[2.9rem] -rotate-45"
              viewBox="0 0 24 24"
              preserveAspectRatio="none"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
            </svg>
          </div>
          {collapsed ? null : (
            <div className="min-w-0">
              <div className="text-[1.05rem] font-bold uppercase tracking-tight text-sidebar-foreground">DAIBILET</div>
              <p className="mt-0.5 text-small text-sidebar-foreground/65">Админ-панель · v3</p>
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-2 pb-4">
        <div className="space-y-4">
          {navigation.map((section) => {
            const items = section.items.filter((i) => isFeatureEnabled(i.feature));
            if (items.length === 0) return null;
            return (
              <div key={section.title}>
                {/* В V3 не показываем подписи групп, только ритм отступов */}
                <div className="space-y-1">
                      {items.map((item) => {
                    const showInboxBadge = Boolean(item.inboxBadge && inboxTotal > 0);
                    return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium outline-none transition',
                          isActive
                            ? 'bg-primary/10 font-semibold text-primary shadow-[inset_3px_0_0_0_hsl(var(--primary))]'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent',
                          collapsed ? 'justify-center' : '',
                        )
                      }
                      title={collapsed ? item.label : undefined}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {collapsed ? null : (
                        <span className="flex min-w-0 flex-1 items-center gap-1.5">
                          <span className="truncate">{item.label}</span>
                          {showInboxBadge ? (
                            <span
                              className="inline-flex min-w-[1.25rem] justify-center rounded-full bg-amber-600 px-1 text-[10px] font-semibold leading-none text-white"
                              title={`Незакрытых обращений: ${inboxTotal}`}
                            >
                              {inboxTotal > 99 ? '99+' : inboxTotal}
                            </span>
                          ) : null}
                        </span>
                      )}
                    </NavLink>
                  );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t p-2 text-xs text-sidebar-foreground/60">
        {collapsed ? <div className="text-center">v3</div> : <div>DAIBILET • v3</div>}
      </div>
    </div>
  );
}

