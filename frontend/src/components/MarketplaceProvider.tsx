"use client";

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe } from 'lucide-react';

// Marketplace type
export type Marketplace = 'wildberries' | 'ozon';

// Marketplace context value interface
interface MarketplaceContextValue {
  marketplace: Marketplace;
  setMarketplace: (marketplace: Marketplace) => void;
}

// Context creation
const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);

// Storage key for persistence
const STORAGE_KEY = 'wbhelper-marketplace';

/**
 * MarketplaceProvider
 * Provides marketplace context (WB or Ozon) with dropdown selector
 * Persists selection to localStorage
 */
export function MarketplaceProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [marketplace, setMarketplaceState] = useState<Marketplace>('wildberries');

  // Load persisted marketplace on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'wildberries' || stored === 'ozon') {
      setMarketplaceState(stored);
    }
  }, []);

  // Update marketplace and persist
  const setMarketplace = useCallback((value: Marketplace) => {
    setMarketplaceState(value);
    localStorage.setItem(STORAGE_KEY, value);
  }, []);

  return (
    <MarketplaceContext.Provider value={{ marketplace, setMarketplace }}>
      <div className="flex flex-col h-full">
        {/* Marketplace selector header */}
        <div data-testid="marketplace-badge" className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <Select
            value={marketplace}
            onValueChange={(value) => setMarketplace(value as Marketplace)}
          >
            <SelectTrigger data-testid="marketplace-select" className="w-[180px] h-8 text-sm bg-background">
              <SelectValue placeholder={t('marketplace.select')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem data-testid="marketplace-option-wildberries" value="wildberries">
                {t('marketplace.wildberries')}
              </SelectItem>
              <SelectItem data-testid="marketplace-option-ozon" value="ozon">
                {t('marketplace.ozon')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Page content */}
        <div className="flex-1">{children}</div>
      </div>
    </MarketplaceContext.Provider>
  );
}

/**
 * Hook to access marketplace context
 * @throws Error if used outside MarketplaceProvider
 */
export function useMarketplace(): MarketplaceContextValue {
  const context = useContext(MarketplaceContext);
  if (!context) {
    throw new Error('useMarketplace must be used within MarketplaceProvider');
  }
  return context;
}