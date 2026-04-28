import { NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Settings,
  ChevronLeft,
  ChevronRight,
  FileText,
  TrendingDown,
  Target,
  Search,
} from 'lucide-react';
import { useSidebarStore } from '../../stores/sidebarStore';
import { useTranslation } from 'react-i18next';

interface NavItem {
  path: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { path: '/dashboard', labelKey: 'layout.dashboard', icon: LayoutDashboard },
  { path: '/competitors', labelKey: 'layout.competitors', icon: Users },
  { path: '/optimization', labelKey: 'layout.optimization', icon: TrendingUp },
  { path: '/seo-content', labelKey: 'layout.seoContent', icon: FileText },
  { path: '/seo/dashboard', labelKey: 'layout.seoModule', icon: Search },
  { path: '/returns-forecast', labelKey: 'layout.returnsForecast', icon: TrendingDown },
  { path: '/niche-analysis', labelKey: 'layout.nicheAnalysis', icon: Target },
  { path: '/settings', labelKey: 'layout.settings', icon: Settings },
];

export function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { isCollapsed, isMobileOpen, toggleCollapse, toggleMobile, closeMobile } =
    useSidebarStore();

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        onClick={closeMobile}
      />

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed left-0 top-0 z-50 h-screen flex flex-col',
          'bg-background dark:bg-background',
          'border-r border-border dark:border-border',
          'transition-all duration-200 ease-in-out',
          isCollapsed ? 'w-16' : 'w-56',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className={clsx(
          'flex items-center justify-between h-16 px-4',
          'border-b border-border dark:border-border'
        )}>
          {!isCollapsed && (
            <span className="text-lg font-semibold text-primary dark:text-primary">
              WBhelper
            </span>
          )}
          <button
            onClick={toggleCollapse}
            className={clsx(
              'hidden md:flex items-center justify-center',
              'w-8 h-8 rounded-md',
              'text-muted-foreground hover:text-foreground',
              'hover:bg-accent/20 dark:hover:bg-white/5',
              'transition-colors duration-150'
            )}
            title={isCollapsed ? t('layout.sidebar.expand') : t('layout.sidebar.collapse')}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={toggleMobile}
            className={clsx(
              'flex md:hidden items-center justify-center',
              'w-8 h-8 rounded-md text-muted-foreground',
              'hover:text-foreground'
            )}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {navItems.map(({ path, labelKey, icon: Icon }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  onClick={closeMobile}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md',
                    'text-sm font-medium transition-colors duration-150',
                    isActive(path)
                      ? clsx(
                          'bg-primary/10 dark:bg-white/10',
                          'text-foreground',
                          'border-l-2 border-primary'
                        )
                      : clsx(
                          'text-muted-foreground',
                          'hover:text-foreground',
                          'hover:bg-accent/20 dark:hover:bg-white/5'
                        )
                  )}
                >
                  <Icon
                    className={clsx(
                      'w-5 h-5 flex-shrink-0',
                      isActive(path)
                        ? 'text-primary'
                        : 'text-muted-foreground'
                    )}
                  />
                  {!isCollapsed && <span>{t(labelKey)}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Collapse toggle for mobile */}
        <div className={clsx(
          'p-2 border-t md:hidden',
          'border-border dark:border-border'
        )}>
          <button
            onClick={toggleCollapse}
            className={clsx(
              'flex items-center justify-center w-full gap-2 px-3 py-2 rounded-md',
              'text-sm text-muted-foreground',
              'hover:text-foreground',
              'hover:bg-accent/20 dark:hover:bg-white/5',
              'transition-colors duration-150'
            )}
          >
            {isCollapsed ? (
              <>
                <ChevronRight className="w-4 h-4" />
                <span>{t('layout.sidebar.expand')}</span>
              </>
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>{t('layout.sidebar.collapse')}</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}