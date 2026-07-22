import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import {
  Autocomplete,
  Box,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
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

type SortMode = 'name' | 'count' | 'player_count' | 'lead_average';

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

function totalValue(statKey: string, playerEntries: [string, PlayerStats][]): number {
  return playerEntries.reduce((sum, [, p]) => sum + getStatValue(statKey, p), 0);
}

function averageValue(statKey: string, playerEntries: [string, PlayerStats][]): number {
  if (playerEntries.length === 0) return 0;
  return totalValue(statKey, playerEntries) / playerEntries.length;
}

export const PlayerComparisonSection: React.FC<PlayerComparisonSectionProps> = ({ players }) => {
  const playerEntries = useMemo(() => Object.entries(players), [players]);
  const categories = useMemo(() => buildComparisonCategories(players), [players]);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [sortMode, setSortMode] = useState<SortMode>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const selectedPlayerName = selectedPlayer
    ? getPlayerDisplayName(players[selectedPlayer], selectedPlayer)
    : '';

  const allStats = useMemo(() => {
    const seen = new Set<string>();
    return categories.flatMap((c) =>
      c.stats.filter((s) => {
        if (seen.has(s.key)) return false;
        seen.add(s.key);
        return true;
      })
    );
  }, [categories]);

  const categoryLabels = useMemo(() => categories.map((c) => c.label), [categories]);

  const visibleStats = useMemo(() => {
    return allStats.filter((stat) => {
      return playerEntries.some(([, p]) => getStatValue(stat.key, p) > 0);
    });
  }, [allStats, playerEntries]);

  const categoryCounts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const counts = new Map<string, number>();
    for (const s of visibleStats) {
      if (!query || s.title.toLowerCase().includes(query)) {
        counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
      }
    }
    return counts;
  }, [visibleStats, searchQuery]);

  const autocompleteOptions = useMemo(
    () => [...new Set(visibleStats.map((s) => s.title))],
    [visibleStats]
  );

  const filteredStats = useMemo(() => {
    let result = visibleStats;

    if (activeCategories.size > 0) {
      result = result.filter((s) => activeCategories.has(s.category));
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((s) => s.title.toLowerCase().includes(query));
    }

    const dir = sortAsc ? 1 : -1;

    switch (sortMode) {
      case 'name':
        result = [...result].sort((a, b) => dir * a.title.localeCompare(b.title));
        break;
      case 'count':
        result = [...result].sort(
          (a, b) => dir * (totalValue(b.key, playerEntries) - totalValue(a.key, playerEntries))
        );
        break;
      case 'player_count': {
        const player = selectedPlayer ? players[selectedPlayer] : null;
        if (player) {
          result = [...result].sort(
            (a, b) => dir * (getStatValue(b.key, player) - getStatValue(a.key, player))
          );
        }
        break;
      }
      case 'lead_average': {
        const player = selectedPlayer ? players[selectedPlayer] : null;
        if (player) {
          result = [...result].sort((a, b) => {
            const leadA = getStatValue(a.key, player) - averageValue(a.key, playerEntries);
            const leadB = getStatValue(b.key, player) - averageValue(b.key, playerEntries);
            return dir * (leadB - leadA);
          });
        }
        break;
      }
    }

    return result;
  }, [
    visibleStats,
    activeCategories,
    searchQuery,
    sortMode,
    sortAsc,
    playerEntries,
    players,
    selectedPlayer
  ]);

  const itemsPerPage = 12;
  const totalPages = Math.ceil(filteredStats.length / itemsPerPage);

  const paginatedStats = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    return filteredStats.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStats, page]);

  const toggleCategory = (label: string) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
    setPage(1);
  };

  const paginator = (): ReactElement => (
    <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
      <Pagination
        count={totalPages}
        page={page}
        onChange={(_e, newPage) => setPage(newPage)}
        color="primary"
        size="large"
        shape="rounded"
      />
    </Box>
  );

  return (
    <ThemedSection title="Player Comparison">
      <Autocomplete
        size="small"
        freeSolo
        fullWidth
        options={autocompleteOptions}
        filterOptions={(options, state) => {
          const input = state.inputValue.toLowerCase();
          const filtered = input ? options.filter((o) => o.toLowerCase().includes(input)) : options;
          return filtered.slice(0, 25);
        }}
        inputValue={searchQuery}
        onInputChange={(_e, value) => {
          setSearchQuery(value);
          setPage(1);
        }}
        sx={{ mb: 2 }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search stats..."
            placeholder="Type to filter..."
          />
        )}
      />
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Chip
          label="All"
          color={activeCategories.size === 0 ? 'primary' : 'default'}
          variant={activeCategories.size === 0 ? 'filled' : 'outlined'}
          onClick={() => {
            setActiveCategories(new Set());
            setPage(1);
          }}
        />
        {categoryLabels.map((label) => {
          const count = categoryCounts.get(label) ?? 0;
          return (
            <Chip
              key={label}
              label={`${label} (${count})`}
              color={activeCategories.has(label) ? 'primary' : 'default'}
              variant={activeCategories.has(label) ? 'filled' : 'outlined'}
              disabled={count === 0}
              onClick={() => toggleCategory(label)}
            />
          );
        })}
      </Box>
      <Paper
        variant="outlined"
        sx={{ p: 1.5, mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}
      >
        <FormControl
          size="small"
          sx={{ minWidth: 140 }}
        >
          <InputLabel id="player-label">Player</InputLabel>
          <Select
            labelId="player-label"
            value={selectedPlayer}
            label="Player"
            onChange={(e) => {
              const val = e.target.value;
              setSelectedPlayer(val);
              if (!val && (sortMode === 'player_count' || sortMode === 'lead_average')) {
                setSortMode('name');
              }
              setPage(1);
            }}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {playerEntries.map(([id, p]) => (
              <MenuItem
                key={id}
                value={id}
              >
                {getPlayerDisplayName(p, id)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl
          size="small"
          sx={{ minWidth: 170 }}
        >
          <InputLabel id="sort-label">Sort by</InputLabel>
          <Select
            labelId="sort-label"
            value={sortMode}
            label="Sort by"
            onChange={(e) => {
              setSortMode(e.target.value as SortMode);
              setPage(1);
            }}
          >
            <MenuItem value="name">Name</MenuItem>
            <MenuItem value="count">Count</MenuItem>
            <MenuItem
              value="player_count"
              disabled={!selectedPlayer}
            >
              {selectedPlayerName ? `${selectedPlayerName}'s Count` : "Player's Count"}
            </MenuItem>
            <MenuItem
              value="lead_average"
              disabled={!selectedPlayer}
            >
              {selectedPlayerName
                ? `${selectedPlayerName}'s Lead over Average`
                : 'Lead over Average'}
            </MenuItem>
          </Select>
        </FormControl>
        <Tooltip title={sortAsc ? 'Ascending' : 'Descending'}>
          <IconButton
            size="small"
            onClick={() => {
              setSortAsc((prev) => !prev);
              setPage(1);
            }}
          >
            {sortAsc ? (
              <ArrowUpwardIcon fontSize="small" />
            ) : (
              <ArrowDownwardIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      </Paper>
      {filteredStats.length === 0 && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: 'center', py: 4 }}
        >
          No stats match your filters.
        </Typography>
      )}
      {filteredStats.length > itemsPerPage && paginator()}
      <ResponsiveGrid columns={3}>
        {paginatedStats.map((stat, i) => {
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
              category={stat.category}
            />
          );
        })}
      </ResponsiveGrid>
      {filteredStats.length > itemsPerPage && paginator()}
    </ThemedSection>
  );
};
