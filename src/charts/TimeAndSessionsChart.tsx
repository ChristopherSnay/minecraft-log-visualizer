import { Box, CardContent, CardHeader, useTheme } from '@mui/material';
import { ThemedCard } from '../components/ThemedCard';
import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { getPaletteColor } from '../config/chartColors';
import { getHorizontalBarOptions } from '../utils/chartOptions';
import type { PlayerStats } from '../types';

interface TimeAndSessionsChartProps {
  allPlayers: Record<string, PlayerStats>;
}

export const TimeAndSessionsChart: React.FC<TimeAndSessionsChartProps> = ({
  allPlayers
}) => {
  const theme = useTheme();

  const { chartData, options } = useMemo(() => {
    const playerData = Object.entries(allPlayers)
      .map(([playerId, player]: [string, PlayerStats]) => {
        const customStats = player.custom_stats || {};

        const playTimeHours =
          Math.round(((customStats['minecraft:play_time'] || 0) / 20 / 3600) * 10) / 10;
        const totalWorldTimeHours =
          Math.round(
            ((customStats['minecraft:total_world_time'] || 0) / 20 / 3600) * 10
          ) / 10;
        const timeSinceRestHours =
          Math.round(((customStats['minecraft:time_since_rest'] || 0) / 20 / 3600) * 10) /
          10;
        const timeSinceDeathHours =
          Math.round(
            ((customStats['minecraft:time_since_death'] || 0) / 20 / 3600) * 10
          ) / 10;

        return {
          name: player.name || playerId.substring(0, 8),
          'Play Time (hrs)': playTimeHours,
          'World Time (hrs)': totalWorldTimeHours,
          Sessions: customStats['minecraft:leave_game'] || 0,
          'Time Since Rest (hrs)': timeSinceRestHours,
          'Time Since Death (hrs)': timeSinceDeathHours
        };
      })
      .sort((a, b) => b['Play Time (hrs)'] - a['Play Time (hrs)']);

    const data = {
      labels: playerData.map((p) => p.name),
      datasets: [
        {
          label: 'Play Time (hrs)',
          data: playerData.map((p) => p['Play Time (hrs)']),
          backgroundColor: getPaletteColor(0),
          stack: 'stack0'
        },
        {
          label: 'World Time (hrs)',
          data: playerData.map((p) => p['World Time (hrs)']),
          backgroundColor: getPaletteColor(1),
          stack: 'stack0'
        },
        {
          label: 'Sessions',
          data: playerData.map((p) => p['Sessions']),
          backgroundColor: getPaletteColor(2),
          stack: 'stack0'
        },
        {
          label: 'Time Since Rest (hrs)',
          data: playerData.map((p) => p['Time Since Rest (hrs)']),
          backgroundColor: getPaletteColor(3),
          stack: 'stack0'
        },
        {
          label: 'Time Since Death (hrs)',
          data: playerData.map((p) => p['Time Since Death (hrs)']),
          backgroundColor: getPaletteColor(4),
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
            text: 'Time / Count',
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
      <CardHeader
        title="Time & Sessions"
        subheader="Play time, sessions, and time-based stats"
      />
      <CardContent>
        <Box sx={{ height: 400 }}>
          <Bar data={chartData} options={options} />
        </Box>
      </CardContent>
    </ThemedCard>
  );
};
