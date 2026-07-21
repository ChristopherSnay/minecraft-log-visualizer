import { Box, Container, Typography } from '@mui/material';
import { useCallback, useMemo, useState } from 'react';

import { Activity24HourChart } from '../charts/Activity24HourChart';
import { EventsGanttChart } from '../charts/EventsGanttChart';
import { PlayerChips } from '../components/PlayerChips';
import { PlayerComparisonSection } from '../components/PlayerComparisonSection';
import { PlayerFavoritesSection } from '../components/PlayerFavoritesSection';
import { ServerTotalsSection } from '../components/ServerTotalsSection';
import { StatCards } from '../components/StatCards';
import { ThemedSection } from '../components/ThemedSection';
import { useStats } from '../context/StatsContext';
import { calculateTotals } from '../utils/statsHelpers';

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

  const { deathEvents, joinEvents, leaveEvents, crashEvents, serverSessions } = useMemo(
    () => ({
      deathEvents: stats?.logs?.events?.filter((e) => e.type === 'death'),
      joinEvents: stats?.logs?.events?.filter((e) => e.type === 'join'),
      leaveEvents: stats?.logs?.events?.filter((e) => e.type === 'leave'),
      crashEvents: stats?.logs?.crashes,
      serverSessions: stats?.logs?.server_sessions
    }),
    [stats?.logs]
  );

  const topDeathCauses = useMemo(() => {
    if (!deathEvents || deathEvents.length === 0) return [];
    const causeCounts: Record<string, number> = {};
    deathEvents.forEach((e) => {
      const msg = e.message;
      causeCounts[msg] = (causeCounts[msg] || 0) + 1;
    });
    return Object.entries(causeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cause, count]) => ({ name: cause, value: count }));
  }, [deathEvents]);

  if (statsLoading) {
    return null;
  }

  if (!players || !totals) {
    return (
      <Container
        maxWidth="lg"
        sx={{ py: 4 }}
      >
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography
            variant="h5"
            color="text.secondary"
          >
            No stats available
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1 }}
          >
            Check that /data/stats.json exists
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container
      maxWidth="lg"
      sx={{ py: { xs: 2, md: 4 }, px: { xs: 1, sm: 2 } }}
    >
      {/* Stat Cards - always visible */}
      <StatCards
        totalPlaytimeSeconds={totals.totalPlaytimeSeconds}
        uniquePlayers={totals.uniquePlayers}
        totalBlocksMined={totals.totalBlocksMined}
        totalMobsKilled={totals.totalMobsKilled}
        onPlayersClick={togglePlayers}
      />

      {/* Player Chips - toggled by Players stat card */}
      <PlayerChips
        players={players}
        expanded={playersExpanded}
      />

      {/* Events Gantt */}
      <ThemedSection title="Events Timeline">
        <EventsGanttChart
          allPlayers={players}
          deathEvents={deathEvents}
          joinEvents={joinEvents}
          leaveEvents={leaveEvents}
          crashEvents={crashEvents}
          serverSessions={serverSessions}
        />
        <Box sx={{ mt: 3 }}>
          <Activity24HourChart allPlayers={players} />
        </Box>
      </ThemedSection>

      {/* Player Comparison */}
      <PlayerComparisonSection players={players} />

      {/* Server Totals */}
      <ServerTotalsSection
        players={players}
        topDeathCauses={topDeathCauses}
      />

      {/* Player Favorites */}
      <PlayerFavoritesSection players={players} />

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
        <Typography
          variant="caption"
          color="text.secondary"
        >
          {capturedAt
            ? `Stats captured ${capturedAt.toLocaleString()}`
            : 'Stats captured time unknown'}
        </Typography>
      </Box>
    </Container>
  );
}
