import BarChartIcon from '@mui/icons-material/BarChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import {
  Box,
  CardContent,
  CardHeader,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { ThemedCard } from '../components/ThemedCard';
import { getDatasetColors } from '../config/chartColors';
import { useChartViewMode } from '../hooks/useChartViewMode';
import type { PlayerStats } from '../types';
import { getHorizontalBarOptions } from '../utils/chartOptions';
import { getItemName } from '../utils/itemNames';

interface ItemsPickedUpChartProps {
  allPlayers: Record<string, PlayerStats>;
  limit?: number;
}

export const ItemsPickedUpChart: React.FC<ItemsPickedUpChartProps> = ({
  allPlayers,
  limit = 15
}) => {
  const theme = useTheme();
  const { viewMode, toggleViewMode } = useChartViewMode();

  const { chartData, options, itemData } = useMemo(() => {
    const itemCounts: Record<string, number> = {};

    // Aggregate items picked up from all players
    Object.values(allPlayers).forEach((player: PlayerStats) => {
      if (player.items_picked_up) {
        Object.entries(player.items_picked_up).forEach(
          ([item, count]: [string, number]) => {
            itemCounts[item] = (itemCounts[item] || 0) + count;
          }
        );
      }
    });

    const itemData = Object.entries(itemCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
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

  const maxValue = itemData[0]?.count ?? 1;
  const { backgroundColor } = getDatasetColors(0);

  return (
    <ThemedCard>
      <CardHeader
        title={`Top ${limit} Items Picked Up`}
        action={
          <Tooltip title={viewMode === 'chart' ? 'Table view' : 'Chart view'}>
            <IconButton size="small" sx={{ opacity: 0.5 }} onClick={toggleViewMode}>
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
          <Box sx={{ height: Math.max(400, limit * 35) }}>
            <Bar data={chartData} options={options} />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>#</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  Item
                </TableCell>
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
              {itemData.map((row, i) => (
                <TableRow key={row.name} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {i + 1}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{row.name}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
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
    </ThemedCard>
  );
};
