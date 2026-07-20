import { Box, CircularProgress, Link, Typography } from '@mui/material';
import { Link as RouterLink, useParams } from 'react-router-dom';

import { PlayerOverview } from '../components/PlayerOverview';
import { useStats } from '../context/StatsContext';

export default function PlayerDetailPage() {
  const { playerId } = useParams<{ playerId: string }>();
  const { stats, statsLoading } = useStats();

  if (statsLoading || !stats) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!playerId || !stats.stats.players[playerId]) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Player not found</Typography>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ px: 2, pt: 2 }}>
        <Link
          component={RouterLink}
          to="/"
          sx={{ textDecoration: 'none', fontSize: '0.9rem' }}
        >
          ← Back to Dashboard
        </Link>
      </Box>
      <PlayerOverview
        stats={stats}
        selectedPlayerId={playerId}
      />
    </>
  );
}
