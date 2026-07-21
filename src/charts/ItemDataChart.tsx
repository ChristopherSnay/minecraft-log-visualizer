import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { ChartOptions } from 'chart.js';
import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';

import { ChartEmptyState } from '../components/ChartEmptyState';
import { getDatasetColors } from '../config/chartColors';
import { getHorizontalBarOptions } from '../utils/chartOptions';
import { getItemName } from '../utils/itemNames';
import { ChartWithTable } from '../components/ChartWithTable';

interface ItemDataChartProps {
  data: Record<string, number>;
  title: string;
  limit?: number;
  colorIndex?: number;
}

export const ItemDataChart: React.FC<ItemDataChartProps> = ({
  data,
  title,
  limit = 10,
  colorIndex = 0
}) => {
  const theme = useTheme();

  const { chartData, options, hasData, items } = useMemo(() => {
    if (!data || Object.keys(data).length === 0) {
      return { chartData: null, options: null, hasData: false, items: [] };
    }

    const items = Object.entries(data)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([itemId, count]) => ({
        name: getItemName(itemId),
        count
      }));

    if (items.length === 0) {
      return { chartData: null, options: null, hasData: false, items: [] };
    }

    const chartData = {
      labels: items.map((i) => i.name),
      datasets: [
        {
          label: 'Count',
          data: items.map((i) => i.count),
          ...getDatasetColors(colorIndex)
        }
      ]
    };

    const opts = getHorizontalBarOptions(theme, {
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          beginAtZero: true
        }
      }
    }) as ChartOptions<'bar'>;

    return { chartData, options: opts, hasData: true, items };
  }, [data, limit, colorIndex, theme]);

  if (!hasData) {
    return <ChartEmptyState title={title} />;
  }

  const maxValue = items[0]?.count ?? 1;
  const { backgroundColor } = getDatasetColors(colorIndex);

  return (
    <ChartWithTable
      title={title}
      chartHeight={280}
      chartContent={
        <Bar
          data={chartData!}
          options={options!}
        />
      }
      tableContent={
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Item</TableCell>
              <TableCell
                sx={{ fontWeight: 600, color: 'text.secondary' }}
                align="right"
              >
                Count
              </TableCell>
              <TableCell
                sx={{ fontWeight: 600, color: 'text.secondary', width: '30%' }}
              ></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((row) => (
              <TableRow
                key={row.name}
                hover
              >
                <TableCell>
                  <Typography variant="body2">{row.name}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: 'monospace' }}
                  >
                    {row.count.toLocaleString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box
                    sx={{
                      height: 8,
                      borderRadius: 1,
                      backgroundColor,
                      width: `${(row.count / maxValue) * 100}%`,
                      opacity: 0.8
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      }
    />
  );
};
