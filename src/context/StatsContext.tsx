import { createContext, useContext, type ReactNode } from 'react';
import { useWorldData } from '../hooks/useWorldData';
import type { StatsJson } from '../types';

interface StatsContextValue {
  stats: StatsJson | null;
  statsLoading: boolean;
}

const StatsContext = createContext<StatsContextValue | undefined>(undefined);

export function StatsProvider({ children }: { children: ReactNode }) {
  const value = useWorldData();
  return <StatsContext.Provider value={value}>{children}</StatsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStats(): StatsContextValue {
  const ctx = useContext(StatsContext);
  if (ctx === undefined) {
    throw new Error('useStats must be used within a <StatsProvider>');
  }
  return ctx;
}
