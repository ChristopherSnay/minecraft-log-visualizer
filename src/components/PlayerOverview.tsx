// src/components/PlayerOverview.tsx
import { Box, Container, Paper, Tab, Tabs, Typography } from '@mui/material';
import React, { useState } from 'react';
import { CustomStatsRadarCharts } from '../charts/CustomStatsRadarCharts';
import { ItemDataChart } from '../charts/ItemDataChart';
import { MobsKilledChart } from '../charts/MobsKilledChart';
import { PlayerComparisonChart } from '../charts/PlayerComparisonChart';
import { PlayerRadarChart } from '../charts/PlayerRadarChart';
import type { StatsJson } from '../types';
import { PlaytimeStats } from './PlaytimeStats';
import { ResponsiveGrid } from './SectionHeading';
import { StatCard } from './StatCard';
import { ThemedCard } from './ThemedCard';
import { ThemedSection } from './ThemedSection';

interface PlayerOverviewProps {
  stats: StatsJson;
  selectedPlayerId?: string;
}

export const PlayerOverview: React.FC<PlayerOverviewProps> = ({
  stats,
  selectedPlayerId
}) => {
  const [selectedPlayerTab, setSelectedPlayerTab] = useState(0);

  const players = Object.entries(stats.stats.players);

  // If selectedPlayerId is provided, find it; otherwise use the tab index
  let selectedPlayer;
  if (selectedPlayerId) {
    const player = stats.stats.players[selectedPlayerId];
    if (!player) {
      return <Box>Player not found</Box>;
    }
    selectedPlayer = [selectedPlayerId, player] as const;
  } else {
    selectedPlayer = players[selectedPlayerTab];
  }

  if (!selectedPlayer) {
    return <Box>No players found</Box>;
  }

  const [, playerStats] = selectedPlayer;

  const handlePlayerChange = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedPlayerTab(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Player Selection - only show if no specific player selected */}
      {!selectedPlayerId && (
        <Paper elevation={3} sx={{ mb: 3 }}>
          <Tabs
            value={selectedPlayerTab}
            onChange={handlePlayerChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            {players.map(([id, player]) => (
              <Tab key={id} label={player.name} />
            ))}
          </Tabs>
        </Paper>
      )}

      {/* Player Name Header - show when viewing specific player */}
      {selectedPlayerId && (
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{ color: 'primary.main' }}
          >
            {playerStats.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Player Statistics
          </Typography>
        </Box>
      )}

      {/* Overview */}
      <ThemedSection title="Overview">
        <ResponsiveGrid columns={2}>
          <PlayerRadarChart
            player={playerStats}
            allPlayers={Object.values(stats.stats.players)}
          />
          <PlaytimeStats customStats={playerStats.custom_stats} />
        </ResponsiveGrid>
      </ThemedSection>

      {/* Items & Crafting */}
      <ThemedSection title="Items & Crafting">
        <ResponsiveGrid columns={3}>
          <ItemDataChart
            data={playerStats.items_crafted || {}}
            title="Items Crafted"
            limit={10}
            colorIndex={9}
          />
          <ItemDataChart
            data={playerStats.blocks_mined || {}}
            title="Blocks Mined"
            limit={10}
            colorIndex={8}
          />
          <ItemDataChart
            data={playerStats.items_used || {}}
            title="Items Used"
            limit={10}
            colorIndex={7}
          />
          <ItemDataChart
            data={playerStats.items_picked_up || {}}
            title="Items Picked Up"
            limit={10}
            colorIndex={6}
          />
          <ItemDataChart
            data={playerStats.items_dropped || {}}
            title="Items Dropped"
            limit={10}
            colorIndex={5}
          />
          <ItemDataChart
            data={playerStats.mobs_killed || {}}
            title="Mobs Killed"
            limit={10}
            colorIndex={4}
          />
        </ResponsiveGrid>
      </ThemedSection>

      {/* Combat */}
      <ThemedSection title="Combat">
        <ResponsiveGrid columns={2}>
          <MobsKilledChart mobs={playerStats.mobs_killed} />
          <ThemedCard sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Combat Stats
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 1
              }}
            >
              {[
                {
                  label: 'Damage Dealt',
                  value: `${(playerStats.custom_stats['minecraft:damage_dealt'] / 2).toFixed(1)}`
                },
                {
                  label: 'Damage Taken',
                  value: `${(playerStats.custom_stats['minecraft:damage_taken'] / 2).toFixed(1)}`
                },
                {
                  label: 'Mob Kills',
                  value: playerStats.custom_stats['minecraft:mob_kills']
                },
                { label: 'Deaths', value: playerStats.custom_stats['minecraft:deaths'] }
              ].map((stat) => (
                <StatCard
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  elevation={0}
                />
              ))}
            </Box>
          </ThemedCard>
        </ResponsiveGrid>
      </ThemedSection>

      {/* Custom Stats by Category */}
      <ThemedSection title="Player Compared to All Players">
        <CustomStatsRadarCharts
          player={playerStats}
          allPlayers={Object.values(stats.stats.players)}
        />
      </ThemedSection>

      {/* Player Comparison - only when browsing all players */}
      {!selectedPlayerId && (
        <ThemedSection title="Player Comparison">
          <PlayerComparisonChart players={stats.stats.players} />
        </ThemedSection>
      )}
    </Container>
  );
};
