import { Box, Chip, Container, Typography } from '@mui/material';
import { useCallback, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Activity24HourChart } from '../charts/Activity24HourChart';
import { ActivityMetricsChart } from '../charts/ActivityMetricsChart';
import { BlockCategoriesChart } from '../charts/BlockCategoriesChart';
import { DamageComparisonChart } from '../charts/DamageComparisonChart';
import { DamageRatioChart } from '../charts/DamageRatioChart';
import { EnhancedTravelChart } from '../charts/EnhancedTravelChart';
import { EventsGanttChart } from '../charts/EventsGanttChart';
import { ItemsPickedUpChart } from '../charts/ItemsPickedUpChart';
import { PlayerInteractionsChart } from '../charts/PlayerInteractionsChart';
import { TimeAndSessionsChart } from '../charts/TimeAndSessionsChart';
import { PlayerFavorites } from '../components/PlayerFavorites';
import { ResponsiveGrid } from '../components/SectionHeading';
import { SimplePlayerComparison } from '../components/SimplePlayerComparison';
import { StatCards } from '../components/StatCards';
import { ThemedSection } from '../components/ThemedSection';
import { getPaletteColor } from '../config/chartColors';
import { useStats } from '../context/StatsContext';
import { calculateTotals } from '../utils/statsHelpers';
import { cmToKm, damageToHearts, getPlayerDisplayName, sumRecord, ticksToHours } from '../utils/chartUtils';

export default function HomePage() {
  const { stats, statsLoading } = useStats();
  const [playersExpanded, setPlayersExpanded] = useState(false);
  const togglePlayers = useCallback(() => setPlayersExpanded((prev) => !prev), []);

  const players = stats?.stats?.players;
  const totals = players ? calculateTotals(players) : null;

  const capturedAt = useMemo(
    () => (stats?.captured_at ? new Date(stats.captured_at) : null),
    [stats]
  );

  const playerEntries = useMemo(() => players ? Object.entries(players) : [], [players]);

  const comparisonData = useMemo(() => ({
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
  }), [playerEntries]);

  const { deathEvents, joinEvents, leaveEvents } = useMemo(() => ({
    deathEvents: stats?.logs?.events?.filter((e) => e.type === 'death'),
    joinEvents: stats?.logs?.events?.filter((e) => e.type === 'join'),
    leaveEvents: stats?.logs?.events?.filter((e) => e.type === 'leave')
  }), [stats?.logs?.events]);

  if (statsLoading) {
    return null;
  }

  if (!players || !totals) {
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

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, px: { xs: 1, sm: 2 } }}>
      {/* Stat Cards - always visible */}
      <StatCards
        totalPlaytimeSeconds={totals.totalPlaytimeSeconds}
        uniquePlayers={totals.uniquePlayers}
        totalBlocksMined={totals.totalBlocksMined}
        totalMobsKilled={totals.totalMobsKilled}
        onPlayersClick={togglePlayers}
      />

      {/* Player Chips - toggled by Players stat card */}
      {playersExpanded && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1, mb: 2 }}>
          {playerEntries.map(([id, p], i) => (
            <Chip
              key={id}
              component={RouterLink}
              to={`/player/${id}`}
              label={getPlayerDisplayName(p, id)}
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
          <EventsGanttChart
            allPlayers={players}
            deathEvents={deathEvents}
            joinEvents={joinEvents}
            leaveEvents={leaveEvents}
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

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          mt: 6,
          pt: 2,
          pb: 4,
          textAlign: 'center',
          borderTop: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {capturedAt
            ? `Stats captured ${capturedAt.toLocaleString()}`
            : 'Stats captured time unknown'}
        </Typography>
      </Box>
    </Container>
  );
}
