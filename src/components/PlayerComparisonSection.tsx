import React, { useMemo } from 'react';

import { SimplePlayerComparison } from './SimplePlayerComparison';
import { ResponsiveGrid } from './SectionHeading';
import { ThemedSection } from './ThemedSection';
import { getPaletteColor } from '../config/chartColors';
import {
  cmToKm,
  damageToHearts,
  getPlayerDisplayName,
  sumRecord,
  ticksToHours
} from '../utils/chartUtils';
import type { PlayerStats } from '../types';

interface PlayerComparisonSectionProps {
  players: Record<string, PlayerStats>;
}

export const PlayerComparisonSection: React.FC<PlayerComparisonSectionProps> = ({ players }) => {
  const playerEntries = useMemo(() => Object.entries(players), [players]);

  const data = useMemo(
    () => ({
      playtime: playerEntries
        .map(([id, p]) => ({
          playerId: id,
          name: getPlayerDisplayName(p, id),
          value: ticksToHours(p.custom_stats?.['minecraft:play_time'] ?? 0)
        }))
        .sort((a, b) => b.value - a.value),
      blocks: playerEntries
        .map(([id, p]) => ({
          playerId: id,
          name: getPlayerDisplayName(p, id),
          value: sumRecord(p.blocks_mined)
        }))
        .sort((a, b) => b.value - a.value),
      mobs: playerEntries
        .map(([id, p]) => ({
          playerId: id,
          name: getPlayerDisplayName(p, id),
          value: sumRecord(p.mobs_killed)
        }))
        .sort((a, b) => b.value - a.value),
      itemsCrafted: playerEntries
        .map(([id, p]) => ({
          playerId: id,
          name: getPlayerDisplayName(p, id),
          value: sumRecord(p.items_crafted)
        }))
        .sort((a, b) => b.value - a.value),
      itemsUsed: playerEntries
        .map(([id, p]) => ({
          playerId: id,
          name: getPlayerDisplayName(p, id),
          value: sumRecord(p.items_used)
        }))
        .sort((a, b) => b.value - a.value),
      damageDealt: playerEntries
        .map(([id, p]) => ({
          playerId: id,
          name: getPlayerDisplayName(p, id),
          value: damageToHearts(p.custom_stats?.['minecraft:damage_dealt'] ?? 0)
        }))
        .sort((a, b) => b.value - a.value),
      jumps: playerEntries
        .map(([id, p]) => ({
          playerId: id,
          name: getPlayerDisplayName(p, id),
          value: p.custom_stats?.['minecraft:jump'] ?? 0
        }))
        .sort((a, b) => b.value - a.value),
      damageTaken: playerEntries
        .map(([id, p]) => ({
          playerId: id,
          name: getPlayerDisplayName(p, id),
          value: p.custom_stats?.['minecraft:damage_taken'] ?? 0
        }))
        .sort((a, b) => b.value - a.value),
      distanceWalked: playerEntries
        .map(([id, p]) => ({
          playerId: id,
          name: getPlayerDisplayName(p, id),
          value: cmToKm(p.custom_stats?.['minecraft:walk_one_cm'] ?? 0)
        }))
        .sort((a, b) => b.value - a.value)
    }),
    [playerEntries]
  );

  return (
    <ThemedSection title="Player Comparison">
      <ResponsiveGrid columns={3}>
        <SimplePlayerComparison
          title="Playtime"
          data={data.playtime}
          color={getPaletteColor(0)}
          format={(v) => `${v.toFixed(1)}h`}
        />
        <SimplePlayerComparison
          title="Blocks Mined"
          data={data.blocks}
          color={getPaletteColor(1)}
        />
        <SimplePlayerComparison
          title="Mobs Killed"
          data={data.mobs}
          color={getPaletteColor(2)}
        />
        <SimplePlayerComparison
          title="Items Crafted"
          data={data.itemsCrafted}
          color={getPaletteColor(3)}
        />
        <SimplePlayerComparison
          title="Items Used"
          data={data.itemsUsed}
          color={getPaletteColor(4)}
        />
        <SimplePlayerComparison
          title="Distance Walked"
          data={data.distanceWalked}
          color={getPaletteColor(5)}
          format={(v) => `${v.toFixed(1)}km`}
        />
        <SimplePlayerComparison
          title="Jump Count"
          data={data.jumps}
          color={getPaletteColor(6)}
        />
        <SimplePlayerComparison
          title="Damage Taken"
          data={data.damageTaken}
          color={getPaletteColor(7)}
        />
        <SimplePlayerComparison
          title="Damage Dealt"
          data={data.damageDealt}
          color={getPaletteColor(8)}
          format={(v) => `${v.toFixed(1)}`}
        />
      </ResponsiveGrid>
    </ThemedSection>
  );
};
