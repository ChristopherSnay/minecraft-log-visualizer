import { Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { ChartOptions, TooltipItem } from 'chart.js';
import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';

import { ChartEmptyState } from '../components/ChartEmptyState';
import { ChartWithTable } from '../components/ChartWithTable';
import { PlayerLink } from '../components/PlayerLink';
import { getDatasetColors } from '../config/chartColors';
import type { PlayerStats } from '../types';
import { getBaseChartOptions } from '../utils/chartOptions';
import { buildSortedPlayerRows, damageToHearts, getPlayerDisplayName } from '../utils/chartUtils';

interface DamageComparisonChartProps {
  allPlayers: Record<string, PlayerStats>;
}

export const DamageComparisonChart: React.FC<DamageComparisonChartProps> = ({ allPlayers }) => {
  const theme = useTheme();

  const { chartData, options, playerData } = useMemo(() => {
    const playerData = buildSortedPlayerRows(
      allPlayers,
      (player, playerId) => {
        const cs = player.custom_stats || {};
        const dealt = damageToHearts(cs['minecraft:damage_dealt'] || 0);
        const taken = damageToHearts(cs['minecraft:damage_taken'] || 0);
        return {
          playerId,
          name: getPlayerDisplayName(player, playerId),
          'Damage Dealt': dealt,
          'Damage Taken': taken,
          ratio: dealt > 0 ? (dealt / (taken || 1)).toFixed(2) : '0.00',
          mobKills: cs['minecraft:mob_kills'] || 0,
          deaths: cs['minecraft:deaths'] || 0
        };
      },
      (a, b) => b['Damage Dealt'] - a['Damage Dealt']
    );

    const data = {
      labels: playerData.map((p) => p.name),
      datasets: [
        {
          label: 'Damage Dealt',
          data: playerData.map((p) => p['Damage Dealt']),
          ...getDatasetColors(0)
        },
        {
          label: 'Damage Taken',
          data: playerData.map((p) => p['Damage Taken']),
          ...getDatasetColors(1)
        }
      ]
    };

    const opts = getBaseChartOptions(theme, {
      plugins: {
        tooltip: {
          callbacks: {
            afterBody: (items: TooltipItem<'bar'>[]) => {
              const index = items[0].dataIndex;
              const player = playerData[index];
              return [
                `Ratio: ${player.ratio}:1`,
                `${player.mobKills} kills, ${player.deaths} deaths`
              ];
            }
          }
        }
      },
      scales: {
        y: {
          title: { display: true, text: 'Hearts', color: theme.palette.text.secondary }
        }
      }
    }) as ChartOptions<'bar'>;

    return { chartData: data, options: opts, playerData };
  }, [allPlayers, theme]);

  if (Object.keys(allPlayers).length === 0) {
    return <ChartEmptyState title="Combat Engagement" />;
  }

  return (
    <ChartWithTable
      title="Combat Engagement"
      subheader="Damage dealt vs taken"
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
                Damage Dealt
              </TableCell>
              <TableCell
                sx={{ fontWeight: 600, color: 'text.secondary' }}
                align="right"
              >
                Damage Taken
              </TableCell>
              <TableCell
                sx={{ fontWeight: 600, color: 'text.secondary' }}
                align="right"
              >
                Ratio
              </TableCell>
              <TableCell
                sx={{ fontWeight: 600, color: 'text.secondary' }}
                align="right"
              >
                Kills
              </TableCell>
              <TableCell
                sx={{ fontWeight: 600, color: 'text.secondary' }}
                align="right"
              >
                Deaths
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
                    {row['Damage Dealt'].toFixed(1)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: 'monospace' }}
                  >
                    {row['Damage Taken'].toFixed(1)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: 'monospace' }}
                  >
                    {row.ratio}:1
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: 'monospace' }}
                  >
                    {row.mobKills.toLocaleString()}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: 'monospace' }}
                  >
                    {row.deaths.toLocaleString()}
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
