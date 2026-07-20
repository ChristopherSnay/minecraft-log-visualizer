import { Box, CardContent, CardHeader, useTheme } from '@mui/material';
import { ThemedCard } from '../components/ThemedCard';
import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { getPaletteColor } from '../config/chartColors';
import type { ChartOptions } from 'chart.js';
import type { PlayerStats } from '../types';
import { cmToKm, getPlayerDisplayName } from '../utils/chartUtils';
import { getBaseChartOptions } from '../utils/chartOptions';

interface EnhancedTravelChartProps {
  allPlayers: Record<string, PlayerStats>;
}

export const EnhancedTravelChart: React.FC<EnhancedTravelChartProps> = ({
  allPlayers
}) => {
  const theme = useTheme();

  const { chartData, options } = useMemo(() => {
    const playerData = Object.entries(allPlayers)
      .map(([playerId, player]: [string, PlayerStats]) => {
        const customStats = player.custom_stats || {};

        // Convert cm to km for readability
        return {
          name: getPlayerDisplayName(player, playerId),
          Walk: cmToKm(customStats['minecraft:walk_one_cm'] || 0),
          Sprint: cmToKm(customStats['minecraft:sprint_one_cm'] || 0),
          Boat: cmToKm(customStats['minecraft:boat_one_cm'] || 0),
          Swim: cmToKm(customStats['minecraft:swim_one_cm'] || 0),
          Fly: cmToKm(customStats['minecraft:fly_one_cm'] || 0),
          Climb: cmToKm(customStats['minecraft:climb_one_cm'] || 0),
          Fall: cmToKm(customStats['minecraft:fall_one_cm'] || 0),
          'Walk on Water': cmToKm(customStats['minecraft:walk_on_water_one_cm'] || 0),
          'Walk Underwater': cmToKm(customStats['minecraft:walk_under_water_one_cm'] || 0),
          Crouch: cmToKm(customStats['minecraft:crouch_one_cm'] || 0)
        };
      })
      .sort((a, b) => {
        const aTotal =
          a.Walk +
          a.Sprint +
          a.Boat +
          a.Swim +
          a.Fly +
          a.Climb +
          a.Fall +
          a['Walk on Water'] +
          a['Walk Underwater'] +
          a.Crouch;
        const bTotal =
          b.Walk +
          b.Sprint +
          b.Boat +
          b.Swim +
          b.Fly +
          b.Climb +
          b.Fall +
          b['Walk on Water'] +
          b['Walk Underwater'] +
          b.Crouch;
        return bTotal - aTotal;
      });

    const data = {
      labels: playerData.map((p) => p.name),
      datasets: [
        {
          label: 'Walk',
          data: playerData.map((p) => p.Walk),
          backgroundColor: getPaletteColor(0),
          stack: 'stack0'
        },
        {
          label: 'Sprint',
          data: playerData.map((p) => p.Sprint),
          backgroundColor: getPaletteColor(1),
          stack: 'stack0'
        },
        {
          label: 'Boat',
          data: playerData.map((p) => p.Boat),
          backgroundColor: getPaletteColor(2),
          stack: 'stack0'
        },
        {
          label: 'Swim',
          data: playerData.map((p) => p.Swim),
          backgroundColor: getPaletteColor(3),
          stack: 'stack0'
        },
        {
          label: 'Fly',
          data: playerData.map((p) => p.Fly),
          backgroundColor: getPaletteColor(4),
          stack: 'stack0'
        },
        {
          label: 'Climb',
          data: playerData.map((p) => p.Climb),
          backgroundColor: getPaletteColor(5),
          stack: 'stack0'
        },
        {
          label: 'Fall',
          data: playerData.map((p) => p.Fall),
          backgroundColor: getPaletteColor(6),
          stack: 'stack0'
        },
        {
          label: 'Walk on Water',
          data: playerData.map((p) => p['Walk on Water']),
          backgroundColor: getPaletteColor(7),
          stack: 'stack0'
        },
        {
          label: 'Walk Underwater',
          data: playerData.map((p) => p['Walk Underwater']),
          backgroundColor: getPaletteColor(8),
          stack: 'stack0'
        },
        {
          label: 'Crouch',
          data: playerData.map((p) => p.Crouch),
          backgroundColor: getPaletteColor(9),
          stack: 'stack0'
        }
      ]
    };

    const opts = getBaseChartOptions(theme, {
      scales: {
        x: {
          stacked: true
        },
        y: {
          stacked: true,
          title: {
            display: true,
            text: 'Distance (km)',
            color: theme.palette.text.secondary
          }
        }
      }
    }) as ChartOptions<'bar'>;

    return { chartData: data, options: opts };
  }, [allPlayers, theme]);

  return (
    <ThemedCard>
      <CardHeader
        title="Complete Travel Breakdown (km)"
        subheader="All methods of movement tracked"
      />
      <CardContent>
        <Box sx={{ height: 400 }}>
          <Bar data={chartData} options={options} />
        </Box>
      </CardContent>
    </ThemedCard>
  );
};
