import { Box } from '@mui/material';
import { formatDuration } from '../utils/statsHelpers';
import { StatCard } from './StatCard';

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
    {
      label: 'Total Playtime',
      value: formatDuration(totalPlaytimeSeconds)
    },
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
        <StatCard
          key={stat.label}
          label={stat.label}
          value={stat.value}
          elevation={0}
          onClick={stat.clickable ? onPlayersClick : undefined}
        />
      ))}
    </Box>
  );
}
