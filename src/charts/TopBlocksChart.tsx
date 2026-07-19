import { Box, CardContent, CardHeader, useTheme } from '@mui/material';
import { ThemedCard } from '../components/ThemedCard';
import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { getDatasetColors } from '../config/chartColors';
import { getItemName } from '../utils/itemNames';
import { getHorizontalBarOptions } from '../utils/chartOptions';

interface TopBlocksChartProps {
  blocks: Record<string, number>;
  limit?: number;
}

export const TopBlocksChart: React.FC<TopBlocksChartProps> = ({ blocks, limit = 10 }) => {
  const theme = useTheme();

  const { chartData, options } = useMemo(() => {
    if (!blocks || Object.keys(blocks).length === 0) {
      return { chartData: null, options: null };
    }

    const blockData = Object.entries(blocks)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([name, count]) => ({
        name: getItemName(name),
        count
      }));

    const data = {
      labels: blockData.map((b) => b.name),
      datasets: [
        {
          label: 'Count',
          data: blockData.map((b) => b.count),
          ...getDatasetColors(0)
        }
      ]
    };

    const opts = getHorizontalBarOptions(theme, {
      plugins: {
        legend: {
          display: false
        }
      }
    });

    return { chartData: data, options: opts };
  }, [blocks, limit, theme]);

  if (!chartData) {
    return (
      <ThemedCard>
        <CardHeader title={`Top ${limit} Blocks Mined`} />
        <CardContent>
          <Box sx={{ p: 2, textAlign: 'center', color: theme.palette.text.secondary }}>
            No blocks mined data available
          </Box>
        </CardContent>
      </ThemedCard>
    );
  }

  return (
    <ThemedCard>
      <CardHeader title={`Top ${limit} Blocks Mined`} />
      <CardContent>
        <Box sx={{ height: Math.max(300, limit * 35) }}>
          <Bar data={chartData} options={options} />
        </Box>
      </CardContent>
    </ThemedCard>
  );
};
