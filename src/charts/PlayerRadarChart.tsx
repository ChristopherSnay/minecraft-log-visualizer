import BarChartIcon from '@mui/icons-material/BarChart';
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
import { ThemedCard } from '../components/ThemedCard';
import { useTheme } from '@mui/material/styles';
import {
  Chart,
  Filler,
  Legend,
  RadarController,
  RadialLinearScale,
  Tooltip as ChartTooltip
} from 'chart.js';
import React, { useMemo, useState } from 'react';
import { Radar } from 'react-chartjs-2';
import { getPaletteColor } from '../config/chartColors';
import type { PlayerStats } from '../types';

Chart.register(RadialLinearScale, RadarController, Filler, Legend, ChartTooltip);

import type { ChartOptions } from 'chart.js';

interface PlayerRadarChartProps {
  player: PlayerStats;
  allPlayers: PlayerStats[];
}

export const PlayerRadarChart: React.FC<PlayerRadarChartProps> = ({ player, allPlayers }) => {
  const theme = useTheme();
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const { chartData, options, tableData } = useMemo(() => {
    const cs = player.custom_stats || {};

    const combat =
      (cs['minecraft:mob_kills'] || 0) + (cs['minecraft:damage_dealt'] || 0) / 100;
    const playtimeHours = (cs['minecraft:play_time'] || 0) / 20 / 3600;
    const deaths = cs['minecraft:deaths'] || 0;
    const survival = (playtimeHours / (deaths + 1)) * 100;
    const exploration =
      ((cs['minecraft:walk_one_cm'] || 0) +
        (cs['minecraft:sprint_one_cm'] || 0) +
        (cs['minecraft:fly_one_cm'] || 0) +
        (cs['minecraft:swim_one_cm'] || 0)) /
      100000;
    const industry =
      (cs['minecraft:interact_with_furnace'] || 0) +
      (cs['minecraft:interact_with_crafting_table'] || 0) +
      (cs['minecraft:enchant_item'] || 0);
    const building = Object.values(player.items_crafted || {}).reduce((a, b) => a + b, 0);

    const maxPlaytime = Math.max(...allPlayers.map(p => (p.custom_stats?.['minecraft:play_time'] || 0) / 20 / 3600), 1);
    const playtimePercent = (playtimeHours / maxPlaytime) * 100;

    const raw = [combat, survival, exploration, industry, building, playtimePercent];
    const max = Math.max(...raw, 1);
    const logMax = Math.log10(max + 1);
    const normalized = raw.map((v) =>
      v <= 0 ? 0 : Math.round((Math.log10(v + 1) / logMax) * 100)
    );

    const labels = [
      'Combat',
      'Survival',
      'Exploration',
      'Industry',
      'Building',
      'Playtime vs Others'
    ];

    const descriptions = [
      'Mob kills + damage dealt',
      'Playtime per death — how long they stay alive',
      'Distance traveled (km)',
      'Furnace, crafting table & enchanting usage',
      'Total items crafted',
      'Percentage of most active player\'s playtime'
    ];

    const data = {
      labels,
      datasets: [
        {
          label: player.name,
          data: normalized,
          backgroundColor: `${getPaletteColor(0)}33`,
          borderColor: getPaletteColor(0),
          borderWidth: 2,
          pointBackgroundColor: getPaletteColor(0),
          pointRadius: 4
        }
      ]
    };

    const opts: ChartOptions<'radar'> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => {
              const idx = items[0]?.dataIndex;
              return idx !== undefined ? labels[idx] : '';
            },
            label: (context) => {
              const rawValues = [
                combat,
                survival,
                exploration,
                industry,
                building,
                playtimePercent
              ];
              const raw = rawValues[context.dataIndex];
              const units = ['pts', 'h/death', 'km', 'interactions', 'items', '%'];
              return `${raw.toFixed(1)} ${units[context.dataIndex]} (log-scale)`;
            },
            afterLabel: (context) => {
              const idx = context.dataIndex;
              return descriptions[idx] || '';
            }
          }
        }
      },
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: {
            stepSize: 25,
            color: theme.palette.text.secondary,
            backdropColor: 'transparent',
            font: { size: 10 }
          },
          grid: { color: theme.palette.divider },
          angleLines: { color: theme.palette.divider },
          pointLabels: {
            color: theme.palette.text.primary,
            font: { size: 12, family: theme.typography.fontFamily }
          }
        }
      }
    };

    const rawValues = [combat, survival, exploration, industry, building, playtimePercent];
    const units = ['pts', 'h/death', 'km', 'interactions', 'items', '%'];

    const tableRows = labels.map((label, idx) => ({
      label,
      description: descriptions[idx],
      raw: rawValues[idx],
      unit: units[idx],
      normalized: normalized[idx]
    }));

    return { chartData: data, options: opts, tableData: tableRows };
  }, [player, allPlayers, theme]);

  return (
    <ThemedCard>
      <CardHeader
        title="Playstyle Profile"
        subheader="Normalized comparison across dimensions"
        action={
          <Tooltip title={viewMode === 'chart' ? 'Show table' : 'Show chart'}>
            <IconButton onClick={() => setViewMode(viewMode === 'chart' ? 'table' : 'chart')} size="small" sx={{ opacity: 0.5 }}>
              {viewMode === 'chart' ? <TableChartIcon fontSize="small" /> : <BarChartIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        }
      />
      <CardContent>
        {viewMode === 'chart' ? (
          <Box sx={{ height: 350 }}>
            <Radar data={chartData} options={options} />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Dimension</TableCell>
                <TableCell align="right">Raw Value</TableCell>
                <TableCell align="right">Score</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tableData.map((row) => (
                <TableRow key={row.label}>
                  <TableCell>
                    <Typography variant="body2">{row.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{row.description}</Typography>
                  </TableCell>
                  <TableCell align="right">{row.raw.toFixed(1)} {row.unit}</TableCell>
                  <TableCell align="right">{row.normalized}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </ThemedCard>
  );
};
