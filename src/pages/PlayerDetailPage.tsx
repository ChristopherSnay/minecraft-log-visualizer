import { Box, CircularProgress, Link } from '@mui/material';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { PlayerOverview } from '../components/PlayerOverview';
import { useWorldData } from '../hooks/useWorldData';

export default function PlayerDetailPage() {
  const { playerId } = useParams<{ playerId: string }>();
  const { stats, statsLoading } = useWorldData();

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
        <p>Player not found</p>
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
      <PlayerOverview stats={stats} selectedPlayerId={playerId} />
    </>
  );
}
