import { Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { ChartOptions } from 'chart.js';
import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';

import { ChartEmptyState } from '../components/ChartEmptyState';
import { ChartWithTable } from '../components/ChartWithTable';
import { PlayerLink } from '../components/PlayerLink';
import { getDatasetColors } from '../config/chartColors';
import type { PlayerStats } from '../types';
import { getBaseChartOptions } from '../utils/chartOptions';
import { getPlayerDisplayName } from '../utils/chartUtils';

interface PlayerComparisonChartProps {
  players: Record<string, PlayerStats>;
}

export const PlayerComparisonChart: React.FC<PlayerComparisonChartProps> = ({ players }) => {
  const theme = useTheme();

  const { chartData, options, playerData } = useMemo(() => {
    const playerData = Object.entries(players).map(([id, player]) => ({
      playerId: id,
      name: getPlayerDisplayName(player, id),
      blocksMined: Object.values(player.blocks_mined).reduce((a, b) => a + b, 0),
      itemsCrafted: Object.values(player.items_crafted || {}).reduce((a, b) => a + b, 0),
      itemsUsed: Object.values(player.items_used || {}).reduce((a, b) => a + b, 0),
      mobsKilled: Object.values(player.mobs_killed).reduce((a, b) => a + b, 0)
    }));

    const data = {
      labels: playerData.map((p) => p.name),
      datasets: [
        {
          label: 'Blocks Mined',
          data: playerData.map((p) => p.blocksMined),
          ...getDatasetColors(0)
        },
        {
          label: 'Items Crafted',
          data: playerData.map((p) => p.itemsCrafted),
          ...getDatasetColors(1)
        },
        {
          label: 'Items Used',
          data: playerData.map((p) => p.itemsUsed),
          ...getDatasetColors(2)
        },
        {
          label: 'Mobs Killed',
          data: playerData.map((p) => p.mobsKilled),
          ...getDatasetColors(3)
        }
      ]
    };

    const opts = getBaseChartOptions(theme, {
      scales: { x: { ticks: {} } }
    }) as ChartOptions<'bar'>;

    return { chartData: data, options: opts, playerData };
  }, [players, theme]);

  if (Object.keys(players).length === 0) {
    return <ChartEmptyState title="Player Activity Comparison" />;
  }

  return (
    <ChartWithTable
      title="Player Activity Comparison"
      chartHeight={350}
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
              <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Player</TableCell>
              <TableCell
                sx={{ fontWeight: 600, color: 'text.secondary' }}
                align="right"
              >
                Blocks Mined
              </TableCell>
              <TableCell
                sx={{ fontWeight: 600, color: 'text.secondary' }}
                align="right"
              >
                Items Crafted
              </TableCell>
              <TableCell
                sx={{ fontWeight: 600, color: 'text.secondary' }}
                align="right"
              >
                Items Used
              </TableCell>
              <TableCell
                sx={{ fontWeight: 600, color: 'text.secondary' }}
                align="right"
              >
                Mobs Killed
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {playerData.map((row) => (
              <TableRow
                key={row.name}
                hover
              >
                <TableCell>
                  <PlayerLink playerId={row.playerId}>{row.name}</PlayerLink>
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: 'monospace' }}
                  >
                    {row.blocksMined.toLocaleString()}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: 'monospace' }}
                  >
                    {row.itemsCrafted.toLocaleString()}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: 'monospace' }}
                  >
                    {row.itemsUsed.toLocaleString()}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: 'monospace' }}
                  >
                    {row.mobsKilled.toLocaleString()}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      }
    />
  );
};
