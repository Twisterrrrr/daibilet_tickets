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
      <div className={cn('flex items-center gap-2 px-3 py-3', collapsed ? 'justify-center' : '')}>
        <div className="h-8 w-8 rounded-lg bg-sidebar-accent" />
        {collapsed ? null : <div className="text-sm font-semibold">Admin V3</div>}
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
                          'flex items-center gap-2 rounded-md px-2 py-2 text-sm outline-none transition hover:bg-sidebar-accent',
                          isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground',
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

