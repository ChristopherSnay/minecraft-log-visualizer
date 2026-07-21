import { Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';

import { ChartEmptyState } from '../components/ChartEmptyState';
import { ChartWithTable } from '../components/ChartWithTable';
import { PlayerLink } from '../components/PlayerLink';
import type { PlayerStats } from '../types';
import { getHorizontalBarOptions } from '../utils/chartOptions';
import {
  buildSortedPlayerRows,
  buildStackedBarDatasets,
  getPlayerDisplayName,
  ticksToHours
} from '../utils/chartUtils';

interface TimeAndSessionsChartProps {
  allPlayers: Record<string, PlayerStats>;
}

const FIELDS = [
  'Play Time (hrs)',
  'World Time (hrs)',
  'Sessions',
  'Time Since Rest (hrs)',
  'Time Since Death (hrs)'
] as const;

export const TimeAndSessionsChart: React.FC<TimeAndSessionsChartProps> = ({ allPlayers }) => {
  const theme = useTheme();

  const { chartData, options, playerData } = useMemo(() => {
    const playerData = buildSortedPlayerRows(
      allPlayers,
      (player, playerId) => {
        const cs = player.custom_stats || {};
        return {
          playerId,
          name: getPlayerDisplayName(player, playerId),
          'Play Time (hrs)': ticksToHours(cs['minecraft:play_time'] || 0),
          'World Time (hrs)': ticksToHours(cs['minecraft:total_world_time'] || 0),
          Sessions: cs['minecraft:leave_game'] || 0,
          'Time Since Rest (hrs)': ticksToHours(cs['minecraft:time_since_rest'] || 0),
          'Time Since Death (hrs)': ticksToHours(cs['minecraft:time_since_death'] || 0)
        };
      },
      (a, b) => b['Play Time (hrs)'] - a['Play Time (hrs)']
    );

    const data = {
      labels: playerData.map((p) => p.name),
      datasets: buildStackedBarDatasets(playerData, FIELDS)
    };

    const opts = getHorizontalBarOptions(theme, {
      scales: {
        x: {
          stacked: true,
          title: { display: true, text: 'Time / Count', color: theme.palette.text.secondary }
        },
        y: { stacked: true }
      }
    });

    return { chartData: data, options: opts, playerData };
  }, [allPlayers, theme]);

  if (Object.keys(allPlayers).length === 0) {
    return <ChartEmptyState title="Time & Sessions" />;
  }

  return (
    <ChartWithTable
      title="Time & Sessions"
      subheader="Play time, sessions, and time-based stats"
      chartHeight={400}
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
              {FIELDS.map((f) => (
                <TableCell
                  key={f}
                  sx={{ fontWeight: 600, color: 'text.secondary' }}
                  align="right"
                >
                  {f}
                </TableCell>
              ))}
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
                {FIELDS.map((f) => (
                  <TableCell
                    key={f}
                    align="right"
                  >
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: 'monospace' }}
                    >
                      {row[f].toLocaleString()}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      }
    />
  );
};
