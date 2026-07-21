import { useEffect, useState } from 'react';

import type { StatsJson } from '../types';

export function useWorldData() {
  const [stats, setStats] = useState<StatsJson | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}data/stats.json`);
        const json = await res.json();
        setStats(json);
      } catch {
        // stats will remain null
      }

      setStatsLoading(false);
    })();
  }, []);

  return { stats, statsLoading };
}
