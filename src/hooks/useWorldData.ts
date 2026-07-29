import { useEffect, useState } from 'react';

import type { StatsJson } from '../types';
import { loadTranslations } from '../utils/minecraftTranslations';

export function useWorldData() {
  const [stats, setStats] = useState<StatsJson | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const statsUrl =
          import.meta.env.VITE_STATS_URL ??
          `${import.meta.env.BASE_URL}data/stats.json?t=${Date.now()}`;
        const statsRes = await fetch(statsUrl);
        const json = await statsRes.json();
        setStats(json);
      } catch {
        // stats will remain null
      }

      setStatsLoading(false);
    })();

    loadTranslations().catch(() => {
      // translations will remain empty, translateId falls back to title-case
    });
  }, []);

  return { stats, statsLoading };
}
