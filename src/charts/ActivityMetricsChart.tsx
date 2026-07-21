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
  ticksToMinutes
} from '../utils/chartUtils';

interface ActivityMetricsChartProps {
  allPlayers: Record<string, PlayerStats>;
}

const FIELDS = ['Items Dropped', 'Sneak Time (min)', 'Times Slept'] as const;

export const ActivityMetricsChart: React.FC<ActivityMetricsChartProps> = ({ allPlayers }) => {
  const theme = useTheme();

  const { chartData, options, playerData } = useMemo(() => {
    const playerData = buildSortedPlayerRows(allPlayers, (player, playerId) => {
      const cs = player.custom_stats || {};
      return {
        playerId,
        name: getPlayerDisplayName(player, playerId),
        'Items Dropped': cs['minecraft:drop'] || 0,
        'Sneak Time (min)': ticksToMinutes(cs['minecraft:sneak_time'] || 0),
        'Times Slept': cs['minecraft:sleep_in_bed'] || 0
      };
    });

    const data = {
      labels: playerData.map((p) => p.name),
      datasets: buildStackedBarDatasets(playerData, FIELDS)
    };

    const opts = getHorizontalBarOptions(theme, {
      scales: {
        x: {
          stacked: true,
          title: { display: true, text: 'Count', color: theme.palette.text.secondary }
        },
        y: { stacked: true }
      }
    });

    return { chartData: data, options: opts, playerData };
  }, [allPlayers, theme]);

  if (Object.keys(allPlayers).length === 0) {
    return <ChartEmptyState title="Activity Metrics" />;
  }

  return (
    <ChartWithTable
      title="Activity Metrics"
      subheader="Fun stats about player behavior"
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
