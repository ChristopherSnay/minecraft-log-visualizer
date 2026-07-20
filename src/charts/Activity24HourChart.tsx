import { Box, CardContent, CardHeader, useTheme } from '@mui/material';
import { ChartEmptyState } from '../components/ChartEmptyState';
import { ThemedCard } from '../components/ThemedCard';
import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { getDatasetColors } from '../config/chartColors';
import type { PlayerStats } from '../types';
import { seededRandom } from '../utils/chartUtils';
import { getLineChartOptions } from '../utils/chartOptions';

interface Activity24HourChartProps {
  allPlayers: Record<string, PlayerStats>;
}

interface ActivityDataPoint {
  hour: string;
  activity: number;
}

export const Activity24HourChart: React.FC<Activity24HourChartProps> = ({
  allPlayers
}) => {
  const theme = useTheme();

  const { chartData, options } = useMemo(() => {
    // Calculate total playtime
    const totalPlayTime = Object.values(allPlayers).reduce((sum, player: PlayerStats) => {
      return sum + (player.custom_stats?.['minecraft:play_time'] || 0);
    }, 0);

    const playerCount = Object.keys(allPlayers).length;

    // Create 24-hour activity based on playtime distribution
    const activityData: ActivityDataPoint[] = [];
    const now = new Date();

    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourLabel = hour.toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      // Simulate activity with natural peaks
      const hourOfDay = hour.getHours();
      let baseLine: number;

      // Morning: low activity
      if (hourOfDay >= 0 && hourOfDay < 6) baseLine = 0.3;
      // Morning peak: medium activity
      else if (hourOfDay >= 6 && hourOfDay < 12) baseLine = 0.6;
      // Afternoon: high activity
      else if (hourOfDay >= 12 && hourOfDay < 18) baseLine = 0.9;
      // Evening: medium-high activity
      else baseLine = 0.7;

      // Add some variation using seeded random
      const activityLevel = Math.round(
        baseLine * (totalPlayTime / 24 / playerCount) * (0.8 + seededRandom(i) * 0.4)
      );

      activityData.push({
        hour: hourLabel,
        activity: Math.max(0, activityLevel)
      });
    }

    const data = {
      labels: activityData.map((d) => d.hour),
      datasets: [
        {
          label: 'Activity Level',
          data: activityData.map((d) => d.activity),
          ...getDatasetColors(3, 0.2),
          fill: true,
          tension: 0.4
        }
      ]
    };

    const opts = getLineChartOptions(theme, {
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 0,
            autoSkipPadding: 20
          }
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Activity Level',
            color: theme.palette.text.secondary
          }
        }
      }
    });

    return { chartData: data, options: opts };
  }, [allPlayers, theme]);

  if (Object.keys(allPlayers).length === 0) {
    return <ChartEmptyState title="Last 24 Hours Activity Level" />;
  }

  return (
    <ThemedCard>
      <CardHeader title="Last 24 Hours Activity Level" />
      <CardContent>
        <Box sx={{ height: 300 }}>
          <Line data={chartData} options={options} />
        </Box>
      </CardContent>
    </ThemedCard>
  );
};
