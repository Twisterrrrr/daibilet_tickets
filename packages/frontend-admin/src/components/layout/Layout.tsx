import { LogOut, Moon, Sun, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

import { PageContainer } from '@daibilet/shared-ui';

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
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { clearTokens } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { AdminSidebar } from './AdminSidebar';
import { CommandPalette, CommandPaletteTrigger } from './CommandPalette';

function AdminTopbar({ onOpenCommandPalette }: { onOpenCommandPalette: () => void }) {
  const navigate = useNavigate();
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

  return (
    <header className="sticky top-0 z-20 flex h-10 items-center gap-2.5 border-b border-border/80 bg-card/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:px-4">
      {/* Sidebar toggle: на mobile открывает Sheet, на desktop сворачивает */}
      <SidebarTrigger className="shrink-0" />

      <div className="flex-1" />

      <CommandPaletteTrigger onClick={onOpenCommandPalette} />

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
  );
}

export function Layout() {
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <SidebarProvider>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />

      <div className="flex min-h-screen w-full bg-[#e5e7eb]">
        <AdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col bg-[#e5e7eb]">
          <AdminTopbar onOpenCommandPalette={() => setCommandOpen(true)} />

          <main className="flex-1 overflow-auto bg-[#e5e7eb]">
            <PageContainer className="animate-in-page max-w-none px-3 py-3.5 sm:px-4 xl:px-6 2xl:px-8 lg:py-4">
              <Outlet />
            </PageContainer>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}


