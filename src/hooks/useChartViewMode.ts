import { useCallback, useState } from 'react';

export type ChartViewMode = 'chart' | 'table';

export function useChartViewMode(initial: ChartViewMode = 'chart') {
  const [viewMode, setViewMode] = useState<ChartViewMode>(initial);
  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === 'chart' ? 'table' : 'chart'));
  }, []);
  return { viewMode, setViewMode, toggleViewMode } as const;
}
