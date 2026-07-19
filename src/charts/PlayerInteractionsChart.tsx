import { Box, CardContent, CardHeader, useTheme } from '@mui/material';
import { ThemedCard } from '../components/ThemedCard';
import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { getPaletteColor } from '../config/chartColors';
import { getHorizontalBarOptions } from '../utils/chartOptions';
import type { PlayerStats } from '../types';

interface PlayerInteractionsChartProps {
  allPlayers: Record<string, PlayerStats>;
}

export const PlayerInteractionsChart: React.FC<PlayerInteractionsChartProps> = ({
  allPlayers
}) => {
  const theme = useTheme();

  const { chartData, options } = useMemo(() => {
    const playerData = Object.entries(allPlayers)
      .map(([playerId, player]: [string, PlayerStats]) => {
        const customStats = player.custom_stats || {};

        return {
          name: player.name || playerId.substring(0, 8),
          Furnace: customStats['minecraft:interact_with_furnace'] || 0,
          'Crafting Table': customStats['minecraft:interact_with_crafting_table'] || 0,
          'Open Chest': customStats['minecraft:open_chest'] || 0,
          'Open Barrel': customStats['minecraft:open_barrel'] || 0,
          Enchant: customStats['minecraft:enchant_item'] || 0,
          Villager: customStats['minecraft:talked_to_villager'] || 0,
          Bell: customStats['minecraft:bell_ring'] || 0
        };
      })
      .sort((a, b) => {
        const aTotal =
          a.Furnace +
          a['Crafting Table'] +
          a['Open Chest'] +
          a['Open Barrel'] +
          a.Enchant +
          a.Villager +
          a.Bell;
        const bTotal =
          b.Furnace +
          b['Crafting Table'] +
          b['Open Chest'] +
          b['Open Barrel'] +
          b.Enchant +
          b.Villager +
          b.Bell;
        return bTotal - aTotal;
      });

    const data = {
      labels: playerData.map((p) => p.name),
      datasets: [
        {
          label: 'Furnace',
          data: playerData.map((p) => p.Furnace),
          backgroundColor: getPaletteColor(0),
          stack: 'stack0'
        },
        {
          label: 'Crafting Table',
          data: playerData.map((p) => p['Crafting Table']),
          backgroundColor: getPaletteColor(1),
          stack: 'stack0'
        },
        {
          label: 'Open Chest',
          data: playerData.map((p) => p['Open Chest']),
          backgroundColor: getPaletteColor(2),
          stack: 'stack0'
        },
        {
          label: 'Open Barrel',
          data: playerData.map((p) => p['Open Barrel']),
          backgroundColor: getPaletteColor(3),
          stack: 'stack0'
        },
        {
          label: 'Enchant',
          data: playerData.map((p) => p.Enchant),
          backgroundColor: getPaletteColor(4),
          stack: 'stack0'
        },
        {
          label: 'Villager',
          data: playerData.map((p) => p.Villager),
          backgroundColor: getPaletteColor(5),
          stack: 'stack0'
        },
        {
          label: 'Bell',
          data: playerData.map((p) => p.Bell),
          backgroundColor: getPaletteColor(6),
          stack: 'stack0'
        }
      ]
    };

    const opts = getHorizontalBarOptions(theme, {
      scales: {
        x: {
          stacked: true,
          title: {
            display: true,
            text: 'Interactions',
            color: theme.palette.text.secondary
          }
        },
        y: {
          stacked: true
        }
      }
    });

    return { chartData: data, options: opts };
  }, [allPlayers, theme]);

  return (
    <ThemedCard>
      <CardHeader
        title="Player Interactions"
        subheader="How players interact with game objects"
      />
      <CardContent>
        <Box sx={{ height: 500 }}>
          <Bar data={chartData} options={options} />
        </Box>
      </CardContent>
    </ThemedCard>
  );
};
