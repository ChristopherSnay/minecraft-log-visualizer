import { Box, CardContent, CardHeader, useTheme } from '@mui/material';
import { ThemedCard } from '../components/ThemedCard';
import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { getDatasetColors } from '../config/chartColors';
import { getItemName } from '../utils/itemNames';
import { getBaseChartOptions } from '../utils/chartOptions';

interface ItemsCraftedChartProps {
  items: Record<string, number>;
  limit?: number;
}

export const ItemsCraftedChart: React.FC<ItemsCraftedChartProps> = ({
  items,
  limit = 12
}) => {
  const theme = useTheme();

  const { chartData, options } = useMemo(() => {
    if (!items || Object.keys(items).length === 0) {
      return { chartData: null, options: null };
    }

    const itemData = Object.entries(items)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([name, count]) => ({
        name: getItemName(name),
        count
      }));

    if (itemData.length === 0) {
      return { chartData: null, options: null };
    }

    const data = {
      labels: itemData.map((i) => i.name),
      datasets: [
        {
          label: 'Items Crafted',
          data: itemData.map((i) => i.count),
          ...getDatasetColors(0)
        }
      ]
    };

    const opts = getBaseChartOptions(theme, {
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          ticks: {}
        }
      }
    }) as ChartOptions<'bar'>;

    return { chartData: data, options: opts };
  }, [items, limit, theme]);

  if (!chartData) {
    return (
      <ThemedCard>
        <CardHeader title={`Top ${limit} Items Crafted`} />
        <CardContent>
          <Box sx={{ p: 2, textAlign: 'center', color: theme.palette.text.secondary }}>
            No items crafted data available
          </Box>
        </CardContent>
      </ThemedCard>
    );
  }

  return (
    <ThemedCard>
      <CardHeader title={`Top ${limit} Items Crafted`} />
      <CardContent>
        <Box sx={{ height: 300 }}>
          <Bar data={chartData} options={options} />
        </Box>
      </CardContent>
    </ThemedCard>
  );
};
