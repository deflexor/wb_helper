import { useEffect } from 'react';
import { AppRouter } from './router';
import { useThemeStore } from './stores/themeStore';

function App() {
  const theme = useThemeStore((state) => state.theme);

  // Apply saved theme to document on mount
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  return <AppRouter />;
}

export default App;
