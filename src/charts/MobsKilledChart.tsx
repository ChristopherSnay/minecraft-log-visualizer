import { Box, CardContent, CardHeader, useTheme } from '@mui/material';
import { ThemedCard } from '../components/ThemedCard';
import React, { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { getPaletteColor } from '../config/chartColors';
import { getItemName } from '../utils/itemNames';
import { getPieChartOptions } from '../utils/chartOptions';

interface MobsKilledChartProps {
  mobs: Record<string, number>;
}

export const MobsKilledChart: React.FC<MobsKilledChartProps> = ({ mobs }) => {
  const theme = useTheme();

  const { chartData, options } = useMemo(() => {
    if (!mobs || Object.keys(mobs).length === 0) {
      return { chartData: null, options: null };
    }

    const mobData = Object.entries(mobs)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({
        name: getItemName(name),
        value: count
      }));

    if (mobData.length === 0) {
      return { chartData: null, options: null };
    }

    const data = {
      labels: mobData.map((m) => m.name),
      datasets: [
        {
          label: 'Kills',
          data: mobData.map((m) => m.value),
          backgroundColor: mobData.map((_, index) => getPaletteColor(index)),
          borderColor: theme.palette.background.paper
        }
      ]
    };

    const opts = getPieChartOptions(theme, {});

    return { chartData: data, options: opts };
  }, [mobs, theme]);

  if (!chartData) {
    return (
      <ThemedCard>
        <CardHeader title="Mobs Killed" />
        <CardContent>
          <Box sx={{ p: 2, textAlign: 'center', color: theme.palette.text.secondary }}>
            No mobs killed data available
          </Box>
        </CardContent>
      </ThemedCard>
    );
  }

  return (
    <ThemedCard>
      <CardHeader title="Mobs Killed" />
      <CardContent>
        <Box sx={{ height: 300 }}>
          <Doughnut data={chartData} options={options} />
        </Box>
      </CardContent>
    </ThemedCard>
  );
};
