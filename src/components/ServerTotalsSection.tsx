import React, { useMemo } from 'react';

import { getPaletteColor } from '../config/chartColors';
import type { PlayerStats } from '../types';
import { getAdvancementDisplayName } from '../utils/advancementNames';
import { mergeRecordsTopN } from '../utils/chartUtils';
import { getItemName } from '../utils/itemNames';
import { getStatLabel } from '../utils/statCategories';
import { ResponsiveGrid } from './SectionHeading';
import { SimplePlayerComparison } from './SimplePlayerComparison';
import { ThemedSection } from './ThemedSection';

interface ServerTotalsSectionProps {
  players: Record<string, PlayerStats>;
  topDeathCauses: { name: string; value: number }[];
}

export const ServerTotalsSection: React.FC<ServerTotalsSectionProps> = ({
  players,
  topDeathCauses
}) => {
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
      .slice(0, 5)
      .map(([id, value]) => ({ name: getAdvancementDisplayName(id), value }));
    const customStats = Object.entries(customStatsMerged)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([key, value]) => ({ name: getStatLabel(key), value }));

    return {
      blocks: mergeRecordsTopN(players, 'blocks_mined', 5, getItemName),
      mobs: mergeRecordsTopN(players, 'mobs_killed', 5, getItemName),
      itemsCrafted: mergeRecordsTopN(players, 'items_crafted', 5, getItemName),
      itemsUsed: mergeRecordsTopN(players, 'items_used', 5, getItemName),
      itemsPickedUp: mergeRecordsTopN(players, 'items_picked_up', 5, getItemName),
      itemsDropped: mergeRecordsTopN(players, 'items_dropped', 5, getItemName),
      advancements,
      customStats
    };
  }, [players]);

  return (
    <ThemedSection title="Server Totals">
      <ResponsiveGrid columns={3}>
        <SimplePlayerComparison
          title="Top Blocks Mined"
          data={data.blocks}
          color={getPaletteColor(0)}
        />
        <SimplePlayerComparison
          title="Top Mobs Killed"
          data={data.mobs}
          color={getPaletteColor(1)}
        />
        <SimplePlayerComparison
          title="Top Items Crafted"
          data={data.itemsCrafted}
          color={getPaletteColor(2)}
        />
        <SimplePlayerComparison
          title="Top Items Used"
          data={data.itemsUsed}
          color={getPaletteColor(3)}
        />
        <SimplePlayerComparison
          title="Top Items Picked Up"
          data={data.itemsPickedUp}
          color={getPaletteColor(4)}
        />
        <SimplePlayerComparison
          title="Top Items Dropped"
          data={data.itemsDropped}
          color={getPaletteColor(5)}
        />
        <SimplePlayerComparison
          title="Top Death Causes"
          data={topDeathCauses}
          color={getPaletteColor(6)}
          nameLabel="Cause"
        />
        <SimplePlayerComparison
          title="Top Advancements"
          data={data.advancements}
          color={getPaletteColor(7)}
          nameLabel="Advancement"
        />
        <SimplePlayerComparison
          title="Top Misc Stats"
          data={data.customStats}
          color={getPaletteColor(8)}
          nameLabel="Stat"
        />
      </ResponsiveGrid>
    </ThemedSection>
  );
};
