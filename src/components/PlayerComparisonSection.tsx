import { Box, Pagination, Tab, Tabs } from '@mui/material';
import React, { type ReactElement, useMemo, useState } from 'react';

import { getPaletteColor } from '../config/chartColors';
import type { PlayerStats } from '../types';
import { cmToKm, damageToHearts, getPlayerDisplayName, ticksToHours } from '../utils/chartUtils';
import { buildComparisonCategories } from '../utils/playerComparisonCategories';
import { ResponsiveGrid } from './SectionHeading';
import { SimplePlayerComparison } from './SimplePlayerComparison';
import { ThemedSection } from './ThemedSection';

interface PlayerComparisonSectionProps {
  players: Record<string, PlayerStats>;
}

function getCustomStatValue(key: string, p: PlayerStats): number {
  const raw = p.custom_stats?.[`minecraft:${key}`] ?? 0;
  if (key.endsWith('_one_cm')) return cmToKm(raw);
  if (key === 'play_time' || key.startsWith('time_since_')) return ticksToHours(raw);
  if (key.startsWith('damage_')) return damageToHearts(raw);
  return raw;
}

function getStatValue(statKey: string, p: PlayerStats): number {
  if (statKey.startsWith('blocks:')) {
    return p.blocks_mined?.[`minecraft:${statKey.slice(7)}`] ?? 0;
  }
  if (statKey.startsWith('crafted:')) {
    return p.items_crafted?.[`minecraft:${statKey.slice(8)}`] ?? 0;
  }
  if (statKey.startsWith('using:')) {
    return p.items_used?.[`minecraft:${statKey.slice(6)}`] ?? 0;
  }
  if (statKey.startsWith('killed:')) {
    return p.mobs_killed?.[`minecraft:${statKey.slice(7)}`] ?? 0;
  }
  if (statKey.startsWith('took:')) {
    return p.items_picked_up?.[`minecraft:${statKey.slice(5)}`] ?? 0;
  }
  if (statKey.startsWith('dropped:')) {
    return p.items_dropped?.[`minecraft:${statKey.slice(8)}`] ?? 0;
  }
  if (statKey.startsWith('advancing:')) {
    const fullId = `minecraft:${statKey.slice(10)}`;
    return (p.completed ?? []).some((a) => a.id === fullId) ? 1 : 0;
  }
  if (statKey.startsWith('custom:')) {
    return getCustomStatValue(statKey.slice(7), p);
  }
  return 0;
}

export const PlayerComparisonSection: React.FC<PlayerComparisonSectionProps> = ({ players }) => {
  const playerEntries = useMemo(() => Object.entries(players), [players]);
  const categories = useMemo(() => buildComparisonCategories(players), [players]);
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [page, setPage] = useState(1);

  const category = categories[categoryIndex];

  const allStats = useMemo(() => category?.stats ?? [], [category]);

  const visibleStats = useMemo(() => {
    return allStats.filter((stat) => {
      const rows = playerEntries.map(([_id, p]) => ({
        value: getStatValue(stat.key, p)
      }));
      return !rows.every((r) => r.value === 0);
    });
  }, [allStats, playerEntries]);

  const itemsPerPage = 12;
  const totalPages = Math.ceil(visibleStats.length / itemsPerPage);

  const paginatedStats = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    return visibleStats.slice(startIndex, startIndex + itemsPerPage);
  }, [visibleStats, page]);

  const changePage = (page: number) => {
    setPage(page);
  };

  const paginator = (): ReactElement => (
    <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
      <Pagination
        count={totalPages}
        page={page}
        onChange={(_e, newPage) => changePage(newPage)}
        color="primary"
        size="large"
        shape="rounded"
      />
    </Box>
  );

  return (
    <ThemedSection title="Player Comparison">
      <Box sx={{ mb: 2 }}>
        <Tabs
          value={categoryIndex}
          onChange={(_e, i) => {
            setCategoryIndex(i);
            setPage(1);
          }}
          variant="scrollable"
          scrollButtons="auto"
        >
          {categories.map((c) => (
            <Tab
              key={c.label}
              label={c.label}
            />
          ))}
        </Tabs>
      </Box>
      {visibleStats.length > itemsPerPage && paginator()}
      <ResponsiveGrid columns={3}>
        {paginatedStats
          .map((stat, i) => {
            const rows = playerEntries
              .map(([id, p]) => ({
                playerId: id,
                name: getPlayerDisplayName(p, id),
                value: getStatValue(stat.key, p)
              }))
              .sort((a, b) => b.value - a.value);
            return (
              <SimplePlayerComparison
                key={stat.key}
                title={stat.title}
                data={rows}
                color={getPaletteColor(i)}
                format={stat.format}
              />
            );
          })
          .filter(Boolean)}
      </ResponsiveGrid>
      {visibleStats.length > itemsPerPage && paginator()}
    </ThemedSection>
  );
};
