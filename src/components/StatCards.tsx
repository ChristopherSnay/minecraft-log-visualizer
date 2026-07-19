import { Box, Card, Typography } from '@mui/material';
import { formatDuration } from '../utils/statsHelpers';

interface StatCardsProps {
  totalPlaytimeSeconds: number;
  uniquePlayers: number;
  totalBlocksMined: number;
  totalMobsKilled: number;
  onPlayersClick?: () => void;
}

export function StatCards({
  totalPlaytimeSeconds,
  uniquePlayers,
  totalBlocksMined,
  totalMobsKilled,
  onPlayersClick
}: StatCardsProps) {
  const stats = [
    { label: 'Total Playtime', value: formatDuration(totalPlaytimeSeconds) },
    {
      label: 'Players',
      value: uniquePlayers.toString(),
      clickable: true
    },
    { label: 'Blocks Mined', value: totalBlocksMined.toLocaleString() },
    { label: 'Mobs Killed', value: totalMobsKilled.toString() }
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: 1,
        my: 3
      }}
    >
      {stats.map((stat) => (
        <Card
          key={stat.label}
          elevation={1}
          onClick={stat.clickable ? onPlayersClick : undefined}
          sx={{
            p: 1.5,
            textAlign: 'center',
            background: (theme) => theme.palette.background.paper,
            border: (theme) => `1px solid ${theme.palette.divider}`,
            cursor: stat.clickable ? 'pointer' : 'default',
            transition: 'border-color 0.15s',
            '&:hover': stat.clickable
              ? { borderColor: (theme) => theme.palette.primary.main }
              : undefined
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontSize: '1.4rem',
              fontWeight: 700,
              color: (theme) => theme.palette.primary.main,
              mb: 0.5
            }}
          >
            {stat.value}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.72rem',
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            {stat.label}
          </Typography>
        </Card>
      ))}
    </Box>
  );
}
