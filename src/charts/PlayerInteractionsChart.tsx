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
  getPlayerDisplayName
} from '../utils/chartUtils';

interface PlayerInteractionsChartProps {
  allPlayers: Record<string, PlayerStats>;
}

const FIELDS = [
  'Furnace',
  'Crafting Table',
  'Open Chest',
  'Open Barrel',
  'Enchant',
  'Villager',
  'Bell'
] as const;

export const PlayerInteractionsChart: React.FC<PlayerInteractionsChartProps> = ({ allPlayers }) => {
  const theme = useTheme();

  const { chartData, options, playerData } = useMemo(() => {
    const playerData = buildSortedPlayerRows(allPlayers, (player, playerId) => {
      const cs = player.custom_stats || {};
      return {
        playerId,
        name: getPlayerDisplayName(player, playerId),
        Furnace: cs['minecraft:interact_with_furnace'] || 0,
        'Crafting Table': cs['minecraft:interact_with_crafting_table'] || 0,
        'Open Chest': cs['minecraft:open_chest'] || 0,
        'Open Barrel': cs['minecraft:open_barrel'] || 0,
        Enchant: cs['minecraft:enchant_item'] || 0,
        Villager: cs['minecraft:talked_to_villager'] || 0,
        Bell: cs['minecraft:bell_ring'] || 0
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
          title: { display: true, text: 'Interactions', color: theme.palette.text.secondary }
        },
        y: { stacked: true }
      }
    });

    return { chartData: data, options: opts, playerData };
  }, [allPlayers, theme]);

  if (Object.keys(allPlayers).length === 0) {
    return <ChartEmptyState title="Player Interactions" />;
  }

  return (
    <ChartWithTable
      title="Player Interactions"
      subheader="How players interact with game objects"
      chartHeight={500}
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
