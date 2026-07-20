import BarChartIcon from '@mui/icons-material/BarChart';
import InsightsIcon from '@mui/icons-material/Insights';
import PercentIcon from '@mui/icons-material/Percent';
import TableChartIcon from '@mui/icons-material/TableChart';
import {
  Box,
  CardContent,
  CardHeader,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { ChartOptions } from 'chart.js';
import React, { useMemo, useState } from 'react';
import { Radar } from 'react-chartjs-2';
import { ResponsiveGrid } from '../components/SectionHeading';
import { ThemedCard } from '../components/ThemedCard';
import { getDatasetColors } from '../config/chartColors';
import type { PlayerStats } from '../types';
import { getPresentCategories, getStatLabel } from '../utils/statCategories';

interface CustomStatsRadarChartsProps {
  player: PlayerStats;
  allPlayers: PlayerStats[];
}

type ViewMode = 'normalized' | 'ratio';

function serverAverage(
  key: string,
  allPlayers: PlayerStats[],
  exclude: PlayerStats
): number {
  const others = allPlayers.filter((p) => p !== exclude);
  if (others.length === 0) return 0;
  const sum = others.reduce((acc, p) => acc + (p.custom_stats?.[key] || 0), 0);
  return sum / others.length;
}

function CategoryRadarChart({
  category,
  keys,
  player,
  allPlayers,
  colorIndex
}: {
  category: string;
  keys: string[];
  player: PlayerStats;
  allPlayers: PlayerStats[];
  colorIndex: number;
}) {
  const theme = useTheme();
  const [mode, setMode] = useState<ViewMode>('normalized');
  const [view, setView] = useState<'chart' | 'table'>('chart');

  const { data, options, tableRows } = useMemo(() => {
    const labels = keys.map(getStatLabel);
    const playerValues = keys.map((k) => player.custom_stats[k] || 0);
    const avgValues = keys.map((k) => serverAverage(k, allPlayers, player));

    // Per-stat max used to normalize both series onto a 0..1 scale, so the
    // shape reflects each stat's relative magnitude rather than its raw size.
    const scaleMaxes = keys.map((_, i) => Math.max(playerValues[i], avgValues[i], 1e-9));

    const playerData = keys.map((_, i) =>
      mode === 'ratio'
        ? avgValues[i] > 0
          ? playerValues[i] / avgValues[i]
          : playerValues[i] > 0
            ? 2
            : 0
        : playerValues[i] / scaleMaxes[i]
    );
    // Server Avg is the reference ring: flat 1.0 in ratio mode, else its own
    // normalized value.
    const avgData = keys.map((_, i) =>
      mode === 'ratio' ? 1 : avgValues[i] / scaleMaxes[i]
    );

    const playerColors = getDatasetColors(colorIndex % 10, 0.25);
    const avgColors = getDatasetColors((colorIndex + 5) % 10, 0.15);

    const chartData = {
      labels,
      datasets: [
        {
          label: player.name,
          data: playerData,
          backgroundColor: playerColors.backgroundColor,
          borderColor: playerColors.borderColor,
          borderWidth: 2,
          pointBackgroundColor: playerColors.borderColor,
          pointRadius: 3
        },
        {
          label: mode === 'ratio' ? 'Server Avg (ref)' : 'Server Avg',
          data: avgData,
          backgroundColor: avgColors.backgroundColor,
          borderColor: avgColors.borderColor,
          borderWidth: 2,
          pointBackgroundColor: avgColors.borderColor,
          pointRadius: 3
        }
      ]
    };

    const isRatio = mode === 'ratio';
    const maxValue = isRatio ? Math.max(...playerData, 1) * 1.1 : 1;

    const opts: ChartOptions<'radar'> = {
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
              const i = context.dataIndex;
              const p = playerValues[i];
              const a = avgValues[i];
              if (isRatio) {
                const mult = a > 0 ? (p / a).toFixed(2) : '∞';
                return `${context.dataset.label}: ${mult}x avg`;
              }
              const pct = scaleMaxes[i] > 0 ? Math.round((p / scaleMaxes[i]) * 100) : 0;
              const aPct = scaleMaxes[i] > 0 ? Math.round((a / scaleMaxes[i]) * 100) : 0;
              return `${context.dataset.label}: ${context.dataset.label === player.name ? p.toLocaleString() : a.toLocaleString()} (${context.dataset.label === player.name ? pct : aPct}% of max)`;
            }
          }
        }
      },
      scales: {
        r: {
          beginAtZero: true,
          min: 0,
          max: maxValue,
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
            callback: (value) =>
              isRatio
                ? `${(value as number).toFixed(1)}x`
                : `${Math.round((value as number) * 100)}%`
          }
        }
      }
    };

    const tableRows = keys.map((k, i) => ({
      label: getStatLabel(k),
      player: playerValues[i],
      avg: avgValues[i],
      ratio: avgValues[i] > 0 ? playerValues[i] / avgValues[i] : null
    }));

    return { data: chartData, options: opts, tableRows };
  }, [keys, player, allPlayers, mode, theme, colorIndex]);

  return (
    <ThemedCard>
      <CardHeader
        title={category}
        action={
          <>
            <Tooltip
              title={mode === 'normalized' ? 'Show ratio (vs avg)' : 'Show normalized'}
            >
              <IconButton
                size="small"
                sx={{ opacity: 0.5 }}
                onClick={() => setMode(mode === 'normalized' ? 'ratio' : 'normalized')}
              >
                {mode === 'normalized' ? (
                  <PercentIcon fontSize="small" />
                ) : (
                  <InsightsIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
            <Tooltip title={view === 'chart' ? 'Show table' : 'Show chart'}>
              <IconButton
                size="small"
                sx={{ opacity: 0.5 }}
                onClick={() => setView(view === 'chart' ? 'table' : 'chart')}
              >
                {view === 'chart' ? (
                  <TableChartIcon fontSize="small" />
                ) : (
                  <BarChartIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </>
        }
      />
      <CardContent>
        {view === 'chart' ? (
          <Box sx={{ height: 320 }}>
            <Radar key={`${player.name}-${mode}`} data={data} options={options} />
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Stat</TableCell>
                <TableCell align="right">{player.name}</TableCell>
                <TableCell align="right">Server Avg</TableCell>
                <TableCell align="right">Ratio</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tableRows.map((row) => (
                <TableRow key={row.label} hover>
                  <TableCell>
                    <Typography variant="body2">{row.label}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{row.player.toLocaleString()}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{row.avg.toLocaleString()}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      sx={{ color: theme.palette.primary.main }}
                    >
                      {row.ratio === null ? '∞' : `${row.ratio.toFixed(2)}x`}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </Box>
        )}
      </CardContent>
    </ThemedCard>
  );
}

export const CustomStatsRadarCharts: React.FC<CustomStatsRadarChartsProps> = ({
  player,
  allPlayers
}) => {
  const categories = useMemo(() => getPresentCategories(allPlayers), [allPlayers]);

  if (Object.keys(categories).length === 0) {
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
      {Object.entries(categories).map(([category, keys], index) => (
        <CategoryRadarChart
          key={category}
          category={category}
          keys={keys}
          player={player}
          allPlayers={allPlayers}
          colorIndex={index}
        />
      ))}
    </ResponsiveGrid>
  );
};
