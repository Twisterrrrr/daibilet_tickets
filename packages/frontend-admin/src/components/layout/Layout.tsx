import { ChevronRight, LogOut, Menu, Moon, Sun, User } from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { adminApi } from '@/api/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';
import { clearTokens } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

import { Sidebar } from './Sidebar';

const ROUTE_LABELS: Record<string, string> = {
  '': 'Dashboard',
  events: 'События',
  orders: 'Заказы',
  cities: 'Города',
  tags: 'Теги',
  landings: 'Лендинги',
  combos: 'Combo',
  articles: 'Статьи',
  reviews: 'Отзывы',
  upsells: 'Upsells',
  audit: 'Аудит',
  settings: 'Настройки',
  new: 'Создание',
};

function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      <Link to="/" className="hover:text-foreground transition-colors">
        Dashboard
      </Link>
      {segments.map((segment, idx) => {
        const path = '/' + segments.slice(0, idx + 1).join('/');
        const label = ROUTE_LABELS[segment] || decodeURIComponent(segment);
        const isLast = idx === segments.length - 1;

        return (
          <span key={path} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            {isLast ? (
              <span className="font-medium text-foreground">{label}</span>
            ) : (
              <Link to={path} className="hover:text-foreground transition-colors">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function getPageTitle(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return 'Dashboard';
  const first = segments[0];
  return ROUTE_LABELS[first] || first;
}

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await adminApi.post('/auth/logout');
    } catch {
      // Даже если запрос не прошёл — чистим локально
    }
    clearTokens();
    navigate('/login');
  };

  const pageTitle = getPageTitle(location.pathname);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
        </div>

        {/* Mobile sidebar */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-60 p-0">
            <SheetTitle className="sr-only">Навигация</SheetTitle>
            <Sidebar />
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <div className={cn('flex flex-col transition-all duration-300', collapsed ? 'lg:pl-[68px]' : 'lg:pl-60')}>
          {/* Header */}
          <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
            {/* Mobile menu */}
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
              <span className="sr-only">Меню</span>
            </Button>

            <div className="flex-1">
              <h1 className="text-lg font-semibold sm:hidden">{pageTitle}</h1>
              <div className="hidden sm:block">
                <Breadcrumbs />
              </div>
            </div>

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="text-muted-foreground"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Переключить тему</span>
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">AD</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Администратор</p>
                    <p className="text-xs leading-none text-muted-foreground">admin@daibilet.ru</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Настройки</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Выйти</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          {/* Page content */}
          <main className="flex-1 p-4 sm:p-6 animate-in-page">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
