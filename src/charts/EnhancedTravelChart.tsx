import { Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { ChartOptions } from 'chart.js';
import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';

import { ChartEmptyState } from '../components/ChartEmptyState';
import { ChartWithTable } from '../components/ChartWithTable';
import { PlayerLink } from '../components/PlayerLink';
import type { PlayerStats } from '../types';
import { getBaseChartOptions } from '../utils/chartOptions';
import {
  buildSortedPlayerRows,
  buildStackedBarDatasets,
  cmToKm,
  getPlayerDisplayName
} from '../utils/chartUtils';

interface EnhancedTravelChartProps {
  allPlayers: Record<string, PlayerStats>;
}

const FIELDS = [
  'Walk',
  'Sprint',
  'Boat',
  'Swim',
  'Fly',
  'Climb',
  'Fall',
  'Walk on Water',
  'Walk Underwater',
  'Crouch'
] as const;

export const EnhancedTravelChart: React.FC<EnhancedTravelChartProps> = ({ allPlayers }) => {
  const theme = useTheme();

  const { chartData, options, playerData } = useMemo(() => {
    const playerData = buildSortedPlayerRows(allPlayers, (player, playerId) => {
      const cs = player.custom_stats || {};
      return {
        playerId,
        name: getPlayerDisplayName(player, playerId),
        Walk: cmToKm(cs['minecraft:walk_one_cm'] || 0),
        Sprint: cmToKm(cs['minecraft:sprint_one_cm'] || 0),
        Boat: cmToKm(cs['minecraft:boat_one_cm'] || 0),
        Swim: cmToKm(cs['minecraft:swim_one_cm'] || 0),
        Fly: cmToKm(cs['minecraft:fly_one_cm'] || 0),
        Climb: cmToKm(cs['minecraft:climb_one_cm'] || 0),
        Fall: cmToKm(cs['minecraft:fall_one_cm'] || 0),
        'Walk on Water': cmToKm(cs['minecraft:walk_on_water_one_cm'] || 0),
        'Walk Underwater': cmToKm(cs['minecraft:walk_under_water_one_cm'] || 0),
        Crouch: cmToKm(cs['minecraft:crouch_one_cm'] || 0)
      };
    });

    const data = {
      labels: playerData.map((p) => p.name),
      datasets: buildStackedBarDatasets(playerData, FIELDS)
    };

    const opts = getBaseChartOptions(theme, {
      scales: {
        x: { stacked: true },
        y: {
          stacked: true,
          title: { display: true, text: 'Distance (km)', color: theme.palette.text.secondary }
        }
      }
    }) as ChartOptions<'bar'>;

    return { chartData: data, options: opts, playerData };
  }, [allPlayers, theme]);

  if (Object.keys(allPlayers).length === 0) {
    return <ChartEmptyState title="Complete Travel Breakdown (km)" />;
  }

  return (
    <ChartWithTable
      title="Complete Travel Breakdown (km)"
      subheader="All methods of movement tracked"
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
                      {row[f].toFixed(1)}
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
