import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useSidebarStore } from '../../stores/sidebarStore';
import { useEffect } from 'react';

export function Layout() {
  const { isCollapsed, setCollapsed } = useSidebarStore();

  // Handle mobile sidebar toggle from TopBar hamburger
  useEffect(() => {
    const handleToggleMobile = () => {
      const { toggleMobile, isMobileOpen } = useSidebarStore.getState();
      if (!isMobileOpen) {
        toggleMobile();
      }
    };

    window.addEventListener('toggle-mobile-sidebar', handleToggleMobile);
    return () => {
      window.removeEventListener('toggle-mobile-sidebar', handleToggleMobile);
    };
  }, []);

  // Collapse sidebar on small screens by default
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && !isCollapsed) {
        setCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isCollapsed, setCollapsed]);

  return (
    <div className="min-h-screen bg-black text-white">
      <Sidebar />
      <div
        className={`
          transition-all duration-200 ease-in-out
          ${isCollapsed ? 'md:pl-16' : 'md:pl-56'}
        `}
      >
        <TopBar />
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
