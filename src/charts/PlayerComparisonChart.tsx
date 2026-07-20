import { Box, CardContent, CardHeader, useTheme } from '@mui/material';
import { ChartEmptyState } from '../components/ChartEmptyState';
import { ThemedCard } from '../components/ThemedCard';
import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { getDatasetColors } from '../config/chartColors';
import type { ChartOptions } from 'chart.js';
import type { PlayerStats } from '../types';
import { getPlayerDisplayName } from '../utils/chartUtils';
import { getBaseChartOptions } from '../utils/chartOptions';

interface PlayerComparisonChartProps {
  players: Record<string, PlayerStats>;
}

export const PlayerComparisonChart: React.FC<PlayerComparisonChartProps> = ({
  players
}) => {
  const theme = useTheme();

  const { chartData, options } = useMemo(() => {
    const playerData = Object.entries(players).map(([id, player]) => ({
      name: getPlayerDisplayName(player, id),
      blocksMined: Object.values(player.blocks_mined).reduce((a, b) => a + b, 0),
      itemsCrafted: Object.values(player.items_crafted || {}).reduce((a, b) => a + b, 0),
      itemsUsed: Object.values(player.items_used || {}).reduce((a, b) => a + b, 0),
      mobsKilled: Object.values(player.mobs_killed).reduce((a, b) => a + b, 0)
    }));

    const data = {
      labels: playerData.map((p) => p.name),
      datasets: [
        {
          label: 'Blocks Mined',
          data: playerData.map((p) => p.blocksMined),
          ...getDatasetColors(0)
        },
        {
          label: 'Items Crafted',
          data: playerData.map((p) => p.itemsCrafted),
          ...getDatasetColors(1)
        },
        {
          label: 'Items Used',
          data: playerData.map((p) => p.itemsUsed),
          ...getDatasetColors(2)
        },
        {
          label: 'Mobs Killed',
          data: playerData.map((p) => p.mobsKilled),
          ...getDatasetColors(3)
        }
      ]
    };

    const opts = getBaseChartOptions(theme, {
      scales: {
        x: {
          ticks: {}
        }
      }
    }) as ChartOptions<'bar'>;

    return { chartData: data, options: opts };
  }, [players, theme]);

  if (Object.keys(players).length === 0) {
    return <ChartEmptyState title="Player Activity Comparison" />;
  }

  return (
    <ThemedCard>
      <CardHeader title="Player Activity Comparison" />
      <CardContent>
        <Box sx={{ height: 350 }}>
          <Bar data={chartData} options={options} />
        </Box>
      </CardContent>
    </ThemedCard>
  );
};
