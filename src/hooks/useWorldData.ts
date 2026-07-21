import { useEffect, useState } from 'react';

import type { StatsJson } from '../types';
import { loadTranslations } from '../utils/minecraftTranslations';

export function useWorldData() {
  const [stats, setStats] = useState<StatsJson | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [statsRes] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}data/stats.json`),
          loadTranslations()
        ]);
        const json = await statsRes.json();
        setStats(json);
      } catch {
        // stats will remain null
      }

      setStatsLoading(false);
    })();
  }, []);

  return { stats, statsLoading };
}
