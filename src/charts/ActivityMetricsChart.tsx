import { Box, CardContent, CardHeader, useTheme } from '@mui/material';
import { ThemedCard } from '../components/ThemedCard';
import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { getPaletteColor } from '../config/chartColors';
import { getHorizontalBarOptions } from '../utils/chartOptions';
import type { PlayerStats } from '../types';

interface ActivityMetricsChartProps {
  allPlayers: Record<string, PlayerStats>;
}

export const ActivityMetricsChart: React.FC<ActivityMetricsChartProps> = ({
  allPlayers
}) => {
  const theme = useTheme();

  const { chartData, options } = useMemo(() => {
    const playerData = Object.entries(allPlayers)
      .map(([playerId, player]: [string, PlayerStats]) => {
        const customStats = player.custom_stats || {};

        return {
          name: player.name || playerId.substring(0, 8),
          'Items Dropped': customStats['minecraft:drop'] || 0,
          'Sneak Time (min)': Math.round(
            (customStats['minecraft:sneak_time'] || 0) / 20 / 60
          ),
          'Times Slept': customStats['minecraft:sleep_in_bed'] || 0
        };
      })
      .sort((a, b) => {
        const aTotal = a['Items Dropped'] + a['Sneak Time (min)'] + a['Times Slept'];
        const bTotal = b['Items Dropped'] + b['Sneak Time (min)'] + b['Times Slept'];
        return bTotal - aTotal;
      });

    const data = {
      labels: playerData.map((p) => p.name),
      datasets: [
        {
          label: 'Items Dropped',
          data: playerData.map((p) => p['Items Dropped']),
          backgroundColor: getPaletteColor(0),
          stack: 'stack0'
        },
        {
          label: 'Sneak Time (min)',
          data: playerData.map((p) => p['Sneak Time (min)']),
          backgroundColor: getPaletteColor(1),
          stack: 'stack0'
        },
        {
          label: 'Times Slept',
          data: playerData.map((p) => p['Times Slept']),
          backgroundColor: getPaletteColor(2),
          stack: 'stack0'
        }
      ]
    };

    const opts = getHorizontalBarOptions(theme, {
      scales: {
        x: {
          stacked: true,
          title: {
            display: true,
            text: 'Count',
            color: theme.palette.text.secondary
          }
        },
        y: {
          stacked: true
        }
      }
    });

    return { chartData: data, options: opts };
  }, [allPlayers, theme]);

  return (
    <ThemedCard>
      <CardHeader title="Activity Metrics" subheader="Fun stats about player behavior" />
      <CardContent>
        <Box sx={{ height: 400 }}>
          <Bar data={chartData} options={options} />
        </Box>
      </CardContent>
    </ThemedCard>
  );
};
