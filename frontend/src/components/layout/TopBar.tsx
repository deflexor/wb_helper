import { useCallback } from 'react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { User, LogOut, Globe, Zap } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useAuthStore } from '../../stores/authStore';
import { useUsageStore } from '../../stores/usageStore';
import { changeLanguage, getCurrentLanguage } from '../../i18n';

export function TopBar() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const { limits } = useUsageStore();
  const currentLang = getCurrentLanguage();

  const handleLanguageChange = useCallback(async (lang: string) => {
    await changeLanguage(lang);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  const apiCallsRemaining = limits.apiCallsLimit - limits.apiCalls;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-background dark:bg-black border-b border-border dark:border-charcoal">
      {/* Mobile hamburger - opens sidebar */}
      <button
        className="flex md:hidden items-center justify-center w-10 h-10 rounded-md text-muted-foreground hover:text-foreground dark:hover:text-neon-volt"
        onClick={() => {
          const event = new CustomEvent('toggle-mobile-sidebar');
          window.dispatchEvent(event);
        }}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      <div className="flex-1" />

      {/* Right side items */}
      <div className="flex items-center gap-4">
        {/* Usage limits */}
        <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-neon-volt" />
            <span>
              {limits.apiCalls}/{limits.apiCallsLimit}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={clsx(
                'w-2 h-2 rounded-full',
                apiCallsRemaining < 100 ? 'bg-destructive' : 'bg-green-500 dark:bg-green-500'
              )}
            />
            <span>
              {t('subscription.remaining')}: {apiCallsRemaining}
            </span>
          </div>
        </div>

        {/* Language switcher */}
        <Select value={currentLang} onValueChange={handleLanguageChange}>
          <SelectTrigger className="w-20 h-9 bg-transparent border-border dark:border-charcoal">
            <div className="flex items-center gap-1.5">
              <Globe className="w-4 h-4" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">EN</SelectItem>
            <SelectItem value="ru">RU</SelectItem>
          </SelectContent>
        </Select>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-1 rounded-md hover:bg-muted dark:hover:bg-white/5 transition-colors">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.avatar} alt={user?.name} />
                <AvatarFallback className="bg-neon-volt text-black text-sm">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-black border-border dark:border-charcoal shadow-lg dark:shadow-none">
            <DropdownMenuLabel className="text-muted-foreground font-normal">
              {user?.email || 'user@example.com'}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border dark:bg-charcoal" />
            <DropdownMenuItem
              className="hover:bg-muted dark:hover:bg-white/5 focus:bg-muted dark:focus:bg-white/5 cursor-pointer"
              onClick={() => {}}
            >
              <User className="w-4 h-4 mr-2" />
              {t('layout.header.profile')}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border dark:bg-charcoal" />
            <DropdownMenuItem
              className="hover:bg-muted dark:hover:bg-white/5 focus:bg-muted dark:focus:bg-white/5 cursor-pointer text-red-500 dark:text-red-400"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('layout.header.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme toggle */}
        <ThemeToggle />
      </div>
    </header>
  );
}
