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
import React, { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import type { ChartOptions, TooltipItem } from 'chart.js';
import { getDatasetColors } from '../config/chartColors';
import { getItemName } from '../utils/itemNames';
import type { PlayerStats } from '../types';
import { getHorizontalBarOptions } from '../utils/chartOptions';

interface PlayerFavoritesProps {
  allPlayers: Record<string, PlayerStats>;
  title: string;
  subtitle: string;
  dataKey: 'items_used' | 'mobs_killed' | 'blocks_mined' | 'items_crafted';
  colorIndex?: number;
}

interface FavoriteEntry {
  name: string;
  count: number;
  favorite: string;
}

export const PlayerFavorites: React.FC<PlayerFavoritesProps> = ({
  allPlayers,
  title,
  subtitle,
  dataKey,
  colorIndex = 0
}) => {
  const theme = useTheme();
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const { chartData, options, hasData, playerFavorites } = useMemo(() => {
    const playerFavorites = Object.entries(allPlayers)
      .map(([playerId, player]: [string, PlayerStats]) => {
        const data = player[dataKey] || {};
        const entries = Object.entries(data) as [string, number][];

        if (entries.length === 0) return null;

        const sorted = entries.sort((a, b) => b[1] - a[1]);
        const [itemId, count] = sorted[0];

        const formattedName = getItemName(itemId);

        return {
          name: player.name || playerId.substring(0, 8),
          count: count as number,
          favorite: formattedName
        };
      })
      .filter((p): p is FavoriteEntry => p !== null)
      .sort((a, b) => b.count - a.count);

    if (playerFavorites.length === 0) {
      return { chartData: null, options: null, hasData: false, playerFavorites: [] };
    }

    const data = {
      labels: playerFavorites.map((p) => [p.name, p.favorite]),
      datasets: [
        {
          label: 'Count',
          data: playerFavorites.map((p) => p.count),
          maxBarThickness: 28,
          ...getDatasetColors(colorIndex)
        }
      ]
    };

    const opts = getHorizontalBarOptions(theme, {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            afterLabel: (context: TooltipItem<'bar'>) => {
              const entry = playerFavorites[context.dataIndex];
              return entry ? `Favorite: ${entry.favorite}` : '';
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true
        }
      }
    }) as ChartOptions<'bar'>;

    return { chartData: data, options: opts, hasData: true, playerFavorites };
  }, [allPlayers, dataKey, colorIndex, theme]);

  if (!hasData) {
    return (
      <Card elevation={1} sx={{ border: (t) => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title={title}
          subheader={subtitle}
        />
        <CardContent>
          <Typography variant="body2" color="textSecondary">
            No data available
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const maxValue = playerFavorites[0]?.count ?? 1;
  const { backgroundColor } = getDatasetColors(colorIndex);

  return (
    <Card elevation={1} sx={{ border: (t) => `1px solid ${t.palette.divider}` }}>
      <CardHeader
        title={title}
        subheader={subtitle}
        action={
          <Tooltip title={viewMode === 'chart' ? 'Table view' : 'Chart view'}>
            <IconButton
              size="small"
              sx={{ opacity: 0.5 }}
              onClick={() => setViewMode(viewMode === 'chart' ? 'table' : 'chart')}
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
          <Box sx={{ height: Math.max(280, Object.keys(allPlayers).length * 45 + 60) }}>
            <Bar data={chartData!} options={options!} />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Player</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Favorite</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }} align="right">Count</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', width: '25%' }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {playerFavorites.map((row) => (
                <TableRow key={row.name} hover>
                  <TableCell>
                    <Typography variant="body2">{row.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{row.favorite}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {row.count.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ height: 8, borderRadius: 1, backgroundColor, width: `${(row.count / maxValue) * 100}%`, opacity: 0.8 }} />
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
