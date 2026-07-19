import { Box, Chip, Container, Typography } from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Activity24HourChart } from '../charts/Activity24HourChart';
import { ActivityMetricsChart } from '../charts/ActivityMetricsChart';
import { BlockCategoriesChart } from '../charts/BlockCategoriesChart';
import { DamageComparisonChart } from '../charts/DamageComparisonChart';
import { DamageRatioChart } from '../charts/DamageRatioChart';
import { EnhancedTravelChart } from '../charts/EnhancedTravelChart';
import { EventsTimelineChart } from '../charts/EventsTimelineChart';
import { ItemsPickedUpChart } from '../charts/ItemsPickedUpChart';
import { PlayerInteractionsChart } from '../charts/PlayerInteractionsChart';
import { TimeAndSessionsChart } from '../charts/TimeAndSessionsChart';
import { PlayerFavorites } from '../components/PlayerFavorites';
import { ResponsiveGrid } from '../components/SectionHeading';
import { SimplePlayerComparison } from '../components/SimplePlayerComparison';
import { StatCards } from '../components/StatCards';
import { ThemedSection } from '../components/ThemedSection';
import { getPaletteColor } from '../config/chartColors';
import { useWorldData } from '../hooks/useWorldData';
import type { PlayerStats } from '../types';
import { calculateTotals } from '../utils/statsHelpers';

export default function HomePage() {
  const { stats, statsLoading } = useWorldData();
  const [playersExpanded, setPlayersExpanded] = useState(false);

  if (statsLoading) {
    return null;
  }

  if (!stats?.stats?.players) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h5" color="text.secondary">
            No stats available
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Check that /data/stats.json exists
          </Typography>
        </Box>
      </Container>
    );
  }

  const players = stats.stats.players;
  const totals = calculateTotals(players);

  const playerEntries = Object.entries(players);

  const getPlayerName = (playerId: string, player: PlayerStats) =>
    player.name || playerId.substring(0, 8);

  const sumRecord = (record: Record<string, number> | undefined) =>
    record ? Object.values(record).reduce((a, b) => a + b, 0) : 0;

  const comparisonData = {
    playtime: playerEntries
      .map(([id, p]) => ({
        playerId: id,
        name: getPlayerName(id, p),
        value: +((p.custom_stats?.['minecraft:play_time'] ?? 0) / 20 / 3600).toFixed(2)
      }))
      .sort((a, b) => b.value - a.value),
    blocks: playerEntries
      .map(([id, p]) => ({
        playerId: id,
        name: getPlayerName(id, p),
        value: sumRecord(p.blocks_mined)
      }))
      .sort((a, b) => b.value - a.value),
    mobs: playerEntries
      .map(([id, p]) => ({
        playerId: id,
        name: getPlayerName(id, p),
        value: sumRecord(p.mobs_killed)
      }))
      .sort((a, b) => b.value - a.value),
    itemsCrafted: playerEntries
      .map(([id, p]) => ({
        playerId: id,
        name: getPlayerName(id, p),
        value: sumRecord(p.items_crafted)
      }))
      .sort((a, b) => b.value - a.value),
    itemsUsed: playerEntries
      .map(([id, p]) => ({
        playerId: id,
        name: getPlayerName(id, p),
        value: sumRecord(p.items_used)
      }))
      .sort((a, b) => b.value - a.value),
    damageDealt: playerEntries
      .map(([id, p]) => ({
        playerId: id,
        name: getPlayerName(id, p),
        value:
          Math.round(((p.custom_stats?.['minecraft:damage_dealt'] ?? 0) / 2) * 10) / 10
      }))
      .sort((a, b) => b.value - a.value),
    jumps: playerEntries
      .map(([id, p]) => ({
        playerId: id,
        name: getPlayerName(id, p),
        value: p.custom_stats?.['minecraft:jump'] ?? 0
      }))
      .sort((a, b) => b.value - a.value),
    damageTaken: playerEntries
      .map(([id, p]) => ({
        playerId: id,
        name: getPlayerName(id, p),
        value: p.custom_stats?.['minecraft:damage_taken'] ?? 0
      }))
      .sort((a, b) => b.value - a.value),
    distanceWalked: playerEntries
      .map(([id, p]) => ({
        playerId: id,
        name: getPlayerName(id, p),
        value: +((p.custom_stats?.['minecraft:walk_one_cm'] ?? 0) / 100000).toFixed(1)
      }))
      .sort((a, b) => b.value - a.value)
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, px: { xs: 1, sm: 2 } }}>
      {/* Stat Cards - always visible */}
      <StatCards
        totalPlaytimeSeconds={totals.totalPlaytimeSeconds}
        uniquePlayers={totals.uniquePlayers}
        totalBlocksMined={totals.totalBlocksMined}
        totalMobsKilled={totals.totalMobsKilled}
        onPlayersClick={() => setPlayersExpanded(!playersExpanded)}
      />

      {/* Player Chips - toggled by Players stat card */}
      {playersExpanded && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1, mb: 2 }}>
          {playerEntries.map(([id, p], i) => (
            <Chip
              key={id}
              component={RouterLink}
              to={`/player/${id}`}
              label={getPlayerName(id, p)}
              clickable
              variant="outlined"
              sx={{
                fontWeight: 500,
                borderWidth: 4,
                borderColor: getPaletteColor(i),
                color: getPaletteColor(i),
                '&:hover': { backgroundColor: `${getPaletteColor(i)}14` }
              }}
            />
          ))}
        </Box>
      )}

      {/* Player Comparison */}
      <ThemedSection title="Player Comparison">
        <ResponsiveGrid columns={3}>
          <SimplePlayerComparison
            title="Playtime"
            data={comparisonData.playtime}
            color={getPaletteColor(0)}
            format={(v) => `${v.toFixed(1)}h`}
          />
          <SimplePlayerComparison
            title="Blocks Mined"
            data={comparisonData.blocks}
            color={getPaletteColor(1)}
          />
          <SimplePlayerComparison
            title="Mobs Killed"
            data={comparisonData.mobs}
            color={getPaletteColor(2)}
          />
          <SimplePlayerComparison
            title="Items Crafted"
            data={comparisonData.itemsCrafted}
            color={getPaletteColor(3)}
          />
          <SimplePlayerComparison
            title="Items Used"
            data={comparisonData.itemsUsed}
            color={getPaletteColor(4)}
          />
          <SimplePlayerComparison
            title="Distance Walked"
            data={comparisonData.distanceWalked}
            color={getPaletteColor(5)}
            format={(v) => `${v.toFixed(1)}km`}
          />
          <SimplePlayerComparison
            title="Jump Count"
            data={comparisonData.jumps}
            color={getPaletteColor(6)}
          />
          <SimplePlayerComparison
            title="Damage Taken"
            data={comparisonData.damageTaken}
            color={getPaletteColor(7)}
          />
          <SimplePlayerComparison
            title="Damage Dealt"
            data={comparisonData.damageDealt}
            color={getPaletteColor(8)}
            format={(v) => `${v.toFixed(1)}`}
          />
        </ResponsiveGrid>
      </ThemedSection>

      {/* Player Favorites */}
      <ThemedSection title="Player Favorites">
        <ResponsiveGrid columns={2}>
          <PlayerFavorites
            allPlayers={players}
            title="Favorite Item"
            subtitle="Most used item by each player"
            dataKey="items_used"
            colorIndex={0}
          />
          <PlayerFavorites
            allPlayers={players}
            title="Favorite Mob... to Kill"
            subtitle="Most killed mob by each player"
            dataKey="mobs_killed"
            colorIndex={1}
          />
          <PlayerFavorites
            allPlayers={players}
            title="Favorite Block"
            subtitle="Most mined block by each player"
            dataKey="blocks_mined"
            colorIndex={2}
          />
          <PlayerFavorites
            allPlayers={players}
            title="Favorite Craft"
            subtitle="Most crafted item by each player"
            dataKey="items_crafted"
            colorIndex={3}
          />
        </ResponsiveGrid>
      </ThemedSection>

      {/* Combat & Survival */}
      <ThemedSection title="Combat & Survival">
        <Box sx={{ mb: 3 }}>
          <DamageRatioChart allPlayers={players} />
        </Box>
        <Box sx={{ mb: 3 }}>
          <DamageComparisonChart allPlayers={players} />
        </Box>
      </ThemedSection>

      {/* Activity & Efficiency */}
      <ThemedSection title="Activity & Efficiency">
        <Box sx={{ mb: 3 }}>
          <Activity24HourChart allPlayers={players} />
        </Box>
        <Box sx={{ mb: 3 }}>
          <EventsTimelineChart
            allPlayers={players}
            advancements={stats.advancements}
            deathEvents={stats.logs?.events?.filter((e) => e.type === 'death')}
          />
        </Box>
        <Box sx={{ mb: 3 }}>
          <TimeAndSessionsChart allPlayers={players} />
        </Box>
        <ResponsiveGrid>
          <ActivityMetricsChart allPlayers={players} />
        </ResponsiveGrid>
        <Box sx={{ mb: 3 }}>
          <EnhancedTravelChart allPlayers={players} />
        </Box>
        <Box sx={{ mb: 3 }}>
          <PlayerInteractionsChart allPlayers={players} />
        </Box>
      </ThemedSection>

      {/* Resources & Crafting */}
      <ThemedSection title="Resources & Crafting">
        <ResponsiveGrid>
          <BlockCategoriesChart allPlayers={players} />
          <ItemsPickedUpChart allPlayers={players} limit={10} />
        </ResponsiveGrid>
      </ThemedSection>
    </Container>
  );
}
