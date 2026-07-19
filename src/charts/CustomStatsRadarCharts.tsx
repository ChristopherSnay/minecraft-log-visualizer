import { Box, CardContent, CardHeader, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Radar } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import React, { useMemo } from 'react';
import { ThemedCard } from '../components/ThemedCard';
import { ResponsiveGrid } from '../components/SectionHeading';
import { getDatasetColors } from '../config/chartColors';
import type { PlayerStats } from '../types';
import { getPresentCategories, getStatLabel } from '../utils/statCategories';

interface CustomStatsRadarChartsProps {
  player: PlayerStats;
  allPlayers: PlayerStats[];
}

// Radar charts share one radial scale across all stats in a category, so a
// value like play_time (ticks) would dwarf small counts. We plot log10(value+1)
// for the spoke radius, which compresses wide ranges far more evenly than a
// square root, keeping the real value for tooltips and axis ticks.
const transform = (value: number) => Math.log10(Math.max(value, 0) + 1);

function serverAverage(key: string, allPlayers: PlayerStats[]): number {
  if (allPlayers.length === 0) return 0;
  const sum = allPlayers.reduce(
    (acc, p) => acc + (p.custom_stats?.[key] || 0),
    0
  );
  return sum / allPlayers.length;
}

export const CustomStatsRadarCharts: React.FC<CustomStatsRadarChartsProps> = ({
  player,
  allPlayers
}) => {
  const theme = useTheme();

  const categories = useMemo(
    () => getPresentCategories(player.custom_stats || {}),
    [player.custom_stats]
  );

  // Give each category chart a distinct color pair from the shared palette.
  // The player series uses palette index N; the Server Avg series uses the
  // palette color most opposite to it (N + 5 in a 10-color wheel) so the two
  // series contrast strongly rather than sitting as adjacent hues.
  const paletteSize = 10;
  const opposite = (i: number) => (i + paletteSize / 2) % paletteSize;

  const charts = useMemo(
    () =>
      Object.entries(categories).map(([category, keys], index) => {
        const labels = keys.map(getStatLabel);
        const playerValues = keys.map((k) => player.custom_stats[k] || 0);
        const avgValues = keys.map((k) => serverAverage(k, allPlayers));

        const playerColors = getDatasetColors(index % paletteSize, 0.25);
        const avgColors = getDatasetColors(opposite(index) % paletteSize, 0.15);

        const data = {
          labels,
          datasets: [
            {
              label: player.name,
              data: playerValues.map(transform),
              backgroundColor: playerColors.backgroundColor,
              borderColor: playerColors.borderColor,
              borderWidth: 2,
              pointBackgroundColor: playerColors.borderColor,
              pointRadius: 3
            },
            {
              label: 'Server Avg',
              data: avgValues.map(transform),
              backgroundColor: avgColors.backgroundColor,
              borderColor: avgColors.borderColor,
              borderWidth: 2,
              pointBackgroundColor: avgColors.borderColor,
              pointRadius: 3
            }
          ]
        };

        const options: ChartOptions<'radar'> = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: theme.palette.text.primary,
                font: { family: theme.typography.fontFamily, size: 11 },
                boxWidth: 12
              }
            },
            tooltip: {
              backgroundColor: theme.palette.background.paper,
              titleColor: theme.palette.text.primary,
              bodyColor: theme.palette.text.secondary,
              borderColor: theme.palette.divider,
              borderWidth: 1,
              callbacks: {
                label: (context) => {
                  const isPlayer = context.dataset.label === player.name;
                  const real = isPlayer
                    ? playerValues[context.dataIndex]
                    : avgValues[context.dataIndex];
                  return `${context.dataset.label}: ${real.toLocaleString()}`;
                }
              }
            }
          },
          scales: {
            r: {
              beginAtZero: true,
              angleLines: { color: theme.palette.divider },
              grid: { color: theme.palette.divider },
              pointLabels: {
                color: theme.palette.text.primary,
                font: { size: 11, family: theme.typography.fontFamily }
              },
              ticks: {
                color: theme.palette.text.secondary,
                backdropColor: 'transparent',
                font: { size: 9 },
                maxTicksLimit: 5,
                callback: (value) => {
                  const original = Math.round(Math.pow(10, value as number) - 1);
                  return original >= 1000
                    ? `${(original / 1000).toFixed(0)}k`
                    : `${original}`;
                }
              }
            }
          }
        };

        return { category, data, options };
      }),
    [categories, player, allPlayers, theme]
  );

  if (charts.length === 0) {
    return (
      <ThemedCard>
        <CardContent>
          <Typography variant="body2" color="textSecondary">
            No custom stats recorded yet.
          </Typography>
        </CardContent>
      </ThemedCard>
    );
  }

  return (
    <ResponsiveGrid columns={2}>
      {charts.map(({ category, data, options }) => (
        <ThemedCard key={category}>
          <CardHeader title={category} />
          <CardContent>
            <Box sx={{ height: 320 }}>
              <Radar data={data} options={options} />
            </Box>
          </CardContent>
        </ThemedCard>
      ))}
    </ResponsiveGrid>
  );
};
