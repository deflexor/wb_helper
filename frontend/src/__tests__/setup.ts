import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';

// Simple wrapper without JSX
function AllProviders({ children }: { children: ReactNode }) {
  return children as ReactElement;
}

export const renderWithProviders = (ui: ReactElement, options?: RenderOptions) => {
  return render(ui, { wrapper: AllProviders, ...options });
};