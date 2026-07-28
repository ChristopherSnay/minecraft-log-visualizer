import React, { useMemo } from 'react';

import { getPaletteColor } from '../config/chartColors';
import type { PlayerStats } from '../types';
import { mergeRecordsTopN } from '../utils/chartUtils';
import { translateId } from '../utils/minecraftTranslations';
import { ResponsiveGrid } from './SectionHeading';
import { SimplePlayerComparison } from './SimplePlayerComparison';

interface ServerTotalsSectionProps {
  players: Record<string, PlayerStats>;
}

export const ServerTotalsSection: React.FC<ServerTotalsSectionProps> = ({ players }) => {
  const data = useMemo(() => {
    const advancementCounts: Record<string, number> = {};
    const customStatsMerged: Record<string, number> = {};
    Object.values(players).forEach((player) => {
      if (player.completed) {
        player.completed.forEach((a) => {
          if (!a.id.includes(':recipes/')) {
            advancementCounts[a.id] = (advancementCounts[a.id] || 0) + 1;
          }
        });
      }
      if (player.custom_stats) {
        Object.entries(player.custom_stats)
          .filter(
            ([key]) =>
              ![
                'minecraft:play_time',
                'minecraft:total_world_time',
                'minecraft:time_since_death',
                'minecraft:time_since_rest',
                'minecraft:leave_game'
              ].includes(key)
          )
          .forEach(([key, val]) => {
            customStatsMerged[key] = (customStatsMerged[key] || 0) + val;
          });
      }
    });
    const advancements = Object.entries(advancementCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([id, value]) => ({ name: translateId(id), value }));
    const customStats = Object.entries(customStatsMerged)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([key, value]) => ({ name: translateId(key), value }));

    return {
      blocks: mergeRecordsTopN(players, 'blocks_mined', 10, translateId),
      mobs: mergeRecordsTopN(players, 'mobs_killed', 10, translateId),
      itemsCrafted: mergeRecordsTopN(players, 'items_crafted', 10, translateId),
      itemsUsed: mergeRecordsTopN(players, 'items_used', 10, translateId),
      itemsPickedUp: mergeRecordsTopN(players, 'items_picked_up', 10, translateId),
      itemsDropped: mergeRecordsTopN(players, 'items_dropped', 10, translateId),
      advancements,
      customStats
    };
  }, [players]);

  return (
    <ResponsiveGrid columns={3}>
      <SimplePlayerComparison
        title="Blocks Mined"
        data={data.blocks}
        color={getPaletteColor(0)}
      />
      <SimplePlayerComparison
        title="Mobs Killed"
        data={data.mobs}
        color={getPaletteColor(1)}
      />
      <SimplePlayerComparison
        title="Items Crafted"
        data={data.itemsCrafted}
        color={getPaletteColor(2)}
      />
      <SimplePlayerComparison
        title="Items Used"
        data={data.itemsUsed}
        color={getPaletteColor(3)}
      />
      <SimplePlayerComparison
        title="Items Picked Up"
        data={data.itemsPickedUp}
        color={getPaletteColor(4)}
      />
      <SimplePlayerComparison
        title="Items Dropped"
        data={data.itemsDropped}
        color={getPaletteColor(5)}
      />
      <SimplePlayerComparison
        title="Advancements"
        data={data.advancements}
        color={getPaletteColor(6)}
        nameLabel="Advancement"
      />
      <SimplePlayerComparison
        title="Misc Stats"
        data={data.customStats}
        color={getPaletteColor(7)}
        nameLabel="Stat"
      />
    </ResponsiveGrid>
  );
};
