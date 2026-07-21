import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';

import { ChartEmptyState } from '../components/ChartEmptyState';
import { getDatasetColors } from '../config/chartColors';
import type { PlayerStats } from '../types';
import { getHorizontalBarOptions } from '../utils/chartOptions';
import { getItemName } from '../utils/itemNames';
import { ChartWithTable } from '../components/ChartWithTable';

interface ItemsPickedUpChartProps {
  allPlayers: Record<string, PlayerStats>;
  limit?: number;
}

export const ItemsPickedUpChart: React.FC<ItemsPickedUpChartProps> = ({
  allPlayers,
  limit = 15
}) => {
  const theme = useTheme();

  const { chartData, options, itemData } = useMemo(() => {
    const itemCounts: Record<string, number> = {};

    Object.values(allPlayers).forEach((player: PlayerStats) => {
      if (player.items_picked_up) {
        Object.entries(player.items_picked_up).forEach(([item, count]: [string, number]) => {
          itemCounts[item] = (itemCounts[item] || 0) + count;
        });
      }
    });

    const itemData = Object.entries(itemCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([name, count]) => ({
        name: getItemName(name),
        count
      }));

    const data = {
      labels: itemData.map((i) => i.name),
      datasets: [
        {
          label: 'Count',
          data: itemData.map((i) => i.count),
          ...getDatasetColors(9)
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

    return { chartData: data, options: opts, itemData };
  }, [allPlayers, limit, theme]);

  if (itemData.length === 0) {
    return <ChartEmptyState title={`Top ${limit} Items Picked Up`} />;
  }

  const maxValue = itemData[0]?.count ?? 1;
  const { backgroundColor } = getDatasetColors(9);

  return (
    <ChartWithTable
      title={`Top ${limit} Items Picked Up`}
      chartHeight={Math.max(400, limit * 35)}
      chartContent={
        <Bar
          data={chartData}
          options={options}
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
            {itemData.map((row) => (
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
