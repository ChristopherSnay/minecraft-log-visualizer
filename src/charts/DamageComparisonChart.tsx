import { Box, CardContent, CardHeader, useTheme } from '@mui/material';
import { ChartEmptyState } from '../components/ChartEmptyState';
import { ThemedCard } from '../components/ThemedCard';
import type { ChartOptions, TooltipItem } from 'chart.js';
import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { getDatasetColors } from '../config/chartColors';
import type { PlayerStats } from '../types';
import { damageToHearts, getPlayerDisplayName } from '../utils/chartUtils';
import { getBaseChartOptions } from '../utils/chartOptions';

interface DamageComparisonChartProps {
  allPlayers: Record<string, PlayerStats>;
}

export const DamageComparisonChart: React.FC<DamageComparisonChartProps> = ({
  allPlayers
}) => {
  const theme = useTheme();

  const { chartData, options } = useMemo(() => {
    const playerData = Object.entries(allPlayers)
      .map(([playerId, player]: [string, PlayerStats]) => {
        const customStats = player.custom_stats || {};

        // Convert to half-hearts for readability
        const dealt = damageToHearts(customStats['minecraft:damage_dealt'] || 0);
        const taken = damageToHearts(customStats['minecraft:damage_taken'] || 0);

        return {
          name: getPlayerDisplayName(player, playerId),
          'Damage Dealt': dealt,
          'Damage Taken': taken,
          ratio: dealt > 0 ? (dealt / (taken || 1)).toFixed(2) : '0.00',
          mobKills: customStats['minecraft:mob_kills'] || 0,
          deaths: customStats['minecraft:deaths'] || 0
        };
      })
      .sort((a, b) => b['Damage Dealt'] - a['Damage Dealt']);

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
          title: {
            display: true,
            text: 'Hearts',
            color: theme.palette.text.secondary
          }
        }
      }
    }) as ChartOptions<'bar'>;

    return { chartData: data, options: opts };
  }, [allPlayers, theme]);

  if (Object.keys(allPlayers).length === 0) {
    return <ChartEmptyState title="Combat Engagement" />;
  }

  return (
    <ThemedCard>
      <CardHeader
        title="Combat Engagement"
        subheader="Damage dealt vs taken"
      />
      <CardContent>
        <Box sx={{ height: 350 }}>
          <Bar data={chartData} options={options} />
        </Box>
      </CardContent>
    </ThemedCard>
  );
};
