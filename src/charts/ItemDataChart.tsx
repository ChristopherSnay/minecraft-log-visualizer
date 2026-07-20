import BarChartIcon from '@mui/icons-material/BarChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { ChartOptions } from 'chart.js';
import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';

import { ChartEmptyState } from '../components/ChartEmptyState';
import { getDatasetColors } from '../config/chartColors';
import { useChartViewMode } from '../hooks/useChartViewMode';
import { getHorizontalBarOptions } from '../utils/chartOptions';
import { getItemName } from '../utils/itemNames';

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
  const { viewMode, toggleViewMode } = useChartViewMode();

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
    <Card
      elevation={1}
      sx={{ border: (t) => `1px solid ${t.palette.divider}` }}
    >
      <CardHeader
        title={title}
        action={
          <Tooltip title={viewMode === 'chart' ? 'Table view' : 'Chart view'}>
            <IconButton
              size="small"
              sx={{ opacity: 0.5 }}
              onClick={toggleViewMode}
              aria-label="Toggle chart/table view"
            >
              {viewMode === 'chart' ? (
                <TableChartIcon fontSize="small" />
              ) : (
                <BarChartIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        }
      />
      <CardContent sx={{ pt: 0 }}>
        {viewMode === 'chart' ? (
          <Box sx={{ height: 280 }}>
            <Bar
              data={chartData!}
              options={options!}
            />
          </Box>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
};
