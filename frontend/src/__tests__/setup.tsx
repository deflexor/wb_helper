import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';

// Wrapper component for tests
function AllProviders({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export const renderWithProviders = (ui: ReactElement, options?: RenderOptions) => {
  return render(ui, { wrapper: AllProviders, ...options });
};