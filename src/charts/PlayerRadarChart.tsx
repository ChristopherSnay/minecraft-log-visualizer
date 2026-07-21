import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { ChartOptions } from 'chart.js';
import React, { useMemo } from 'react';
import { Radar } from 'react-chartjs-2';

import { ChartEmptyState } from '../components/ChartEmptyState';
import { ChartWithTable } from '../components/ChartWithTable';
import { getPaletteColor } from '../config/chartColors';
import type { PlayerStats } from '../types';

interface PlayerRadarChartProps {
  player: PlayerStats;
  allPlayers: PlayerStats[];
}

export const PlayerRadarChart: React.FC<PlayerRadarChartProps> = ({ player, allPlayers }) => {
  const theme = useTheme();

  const { chartData, options, tableData } = useMemo(() => {
    const dims = (p: PlayerStats) => {
      const cs = p.custom_stats || {};
      const combat =
        (cs['minecraft:mob_kills'] || 0) +
        (cs['minecraft:damage_dealt'] || 0) / 100 +
        (cs['minecraft:damage_taken'] || 0) / 100;
      const playtimeHours = (cs['minecraft:play_time'] || 0) / 20 / 3600;
      const deaths = cs['minecraft:deaths'] || 0;
      const survival = deaths > 0 ? (playtimeHours / deaths) * 100 : playtimeHours * 100;
      const exploration =
        ((cs['minecraft:walk_one_cm'] || 0) +
          (cs['minecraft:sprint_one_cm'] || 0) +
          (cs['minecraft:fly_one_cm'] || 0) +
          (cs['minecraft:swim_one_cm'] || 0) +
          (cs['minecraft:boat_one_cm'] || 0) +
          (cs['minecraft:climb_one_cm'] || 0) +
          (cs['minecraft:elytra_one_cm'] || 0) +
          (cs['minecraft:minecart_one_cm'] || 0) +
          (cs['minecraft:strider_one_cm'] || 0) +
          (cs['minecraft:walk_on_water_one_cm'] || 0)) /
        100000;
      const industry =
        (cs['minecraft:interact_with_furnace'] || 0) +
        (cs['minecraft:interact_with_crafting_table'] || 0) +
        (cs['minecraft:enchant_item'] || 0) +
        Object.values(p.items_crafted || {}).reduce((a, b) => a + b, 0);
      const building = Object.values(p.items_used || {}).reduce((a, b) => a + b, 0);
      const mining = Object.values(p.blocks_mined || {}).reduce((a, b) => a + b, 0);
      return [combat, survival, exploration, industry, building, playtimeHours, mining];
    };

    const raw = dims(player);

    const others = allPlayers.filter((p) => p !== player);
    const serverRaw = others.length
      ? others
          .map(dims)
          .reduce((acc, d) => d.map((v, i) => acc[i] + v), [0, 0, 0, 0, 0, 0, 0])
          .map((sum) => sum / others.length)
      : raw.map(() => 0);

    const ratios = raw.map((v, i) => (serverRaw[i] > 0 ? v / serverRaw[i] : v > 0 ? 1 : 0));

    const maxRatio = Math.max(...ratios, 1) * 1.15;
    const labels = [
      'Combat',
      'Survival',
      'Exploration',
      'Industry',
      'Building',
      'Playtime',
      'Mining'
    ];
    const descriptions = [
      'Mob kills, damage dealt & taken',
      'Playtime per death, how long they stay alive',
      'Distance traveled by any method (km)',
      'Crafting, enchanting, and item production',
      'Items placed / used in the world',
      'Total playtime (hours)',
      'Blocks broken / mined'
    ];
    const paletteColor = getPaletteColor(6);
    const data = {
      labels,
      datasets: [
        {
          label: player.name,
          data: ratios,
          backgroundColor: `${paletteColor}33`,
          borderColor: paletteColor,
          borderWidth: 2,
          pointBackgroundColor: paletteColor,
          pointRadius: 4
        },
        {
          label: 'Server Avg (1.0)',
          data: Array(labels.length).fill(1),
          backgroundColor: 'transparent',
          borderColor: getPaletteColor(1),
          borderWidth: 1.5,
          borderDash: [6, 3],
          pointRadius: 0
        }
      ]
    };

    const opts: ChartOptions<'radar'> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: theme.palette.text.primary,
            font: { family: theme.typography.fontFamily, size: 11 },
            boxWidth: 12
          }
        },
        tooltip: {
          callbacks: {
            title: (items) => {
              const idx = items[0]?.dataIndex;
              return idx !== undefined ? labels[idx] : '';
            },
            label: (context) => {
              const idx = context.dataIndex;
              const isServer = context.datasetIndex === 1;
              if (isServer) {
                return `Server Avg: ${serverRaw[idx].toFixed(1)} ${units[idx]}`;
              }
              const ratio = ratios[idx];
              const ratioStr = ratio === 0 ? 'N/A' : `${ratio.toFixed(2)}x`;
              return [
                `${player.name}: ${raw[idx].toFixed(1)} ${units[idx]}`,
                `Server Avg: ${serverRaw[idx].toFixed(1)} ${units[idx]}`,
                `Ratio: ${ratioStr}`
              ];
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
          min: 0,
          max: maxRatio,
          ticks: {
            stepSize: 1,
            color: theme.palette.text.secondary,
            backdropColor: 'transparent',
            font: { size: 10 },
            callback: (value) => `${(value as number).toFixed(1)}x`
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

    const units = ['pts', 'h/death', 'km', 'interactions', 'items', 'h', 'blocks'];

    const tableRows = labels.map((label, idx) => ({
      label,
      description: descriptions[idx],
      raw: raw[idx],
      serverRaw: serverRaw[idx],
      unit: units[idx],
      ratio: ratios[idx]
    }));

    return { chartData: data, options: opts, tableData: tableRows };
  }, [player, allPlayers, theme]);

  if (allPlayers.length === 0) {
    return <ChartEmptyState title="Playstyle Profile" />;
  }

  return (
    <ChartWithTable
      title="Playstyle Profile"
      subheader="Ratio to server average (1.0x is average)"
      chartHeight={350}
      chartContent={
        <Radar
          data={chartData}
          options={options}
        />
      }
      tableContent={
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Dimension</TableCell>
                <TableCell align="right">{player.name}</TableCell>
                <TableCell align="right">Server Avg</TableCell>
                <TableCell align="right">Ratio</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tableData.map((row) => (
                <TableRow key={row.label}>
                  <TableCell>
                    <Typography variant="body2">{row.label}</Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      {row.description}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {row.raw.toFixed(1)} {row.unit}
                  </TableCell>
                  <TableCell align="right">
                    {row.serverRaw.toFixed(1)} {row.unit}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color:
                        row.ratio > 1
                          ? 'success.main'
                          : row.ratio < 1
                            ? 'error.main'
                            : 'text.secondary'
                    }}
                  >
                    {row.ratio === 0 ? 'N/A' : `${row.ratio.toFixed(2)}x`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      }
    />
  );
};
