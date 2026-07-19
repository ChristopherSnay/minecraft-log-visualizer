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
  Typography,
  useTheme
} from '@mui/material';
import { ThemedCard } from '../components/ThemedCard';
import type { TooltipItem } from 'chart.js';
import React, { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { CHART_COLORS } from '../config/chartColors';
import { PlayerLink } from '../components/PlayerLink';
import type { PlayerStats } from '../types';
import { getHorizontalBarOptions } from '../utils/chartOptions';

interface DamageRatioChartProps {
  allPlayers: Record<string, PlayerStats>;
}

interface CombatPlayer {
  name: string;
  ratio: number;
}

export const DamageRatioChart: React.FC<DamageRatioChartProps> = ({ allPlayers }) => {
  const theme = useTheme();
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const { chartData, options, playerData } = useMemo(() => {
    const playerData = Object.entries(allPlayers)
      .map(([playerId, player]: [string, PlayerStats]) => {
        const customStats = player.custom_stats || {};
        const dealt = customStats['minecraft:damage_dealt'] || 0;
        const taken = customStats['minecraft:damage_taken'] || 0;
        const ratio = dealt > 0 ? dealt / (taken || 1) : 0;

        // Skip players with no combat
        if (dealt === 0 && taken === 0) {
          return null;
        }

        return {
          name: player.name || playerId.substring(0, 8),
          ratio: Math.round(ratio * 100) / 100
        };
      })
      .filter((p): p is CombatPlayer => p !== null)
      .sort((a, b) => b.ratio - a.ratio);

    if (playerData.length === 0) {
      return { chartData: null, options: null, playerData: [] };
    }

    const data = {
      labels: playerData.map((p) => p.name),
      datasets: [
        {
          label: 'Damage Ratio',
          data: playerData.map((p) => p.ratio),
          backgroundColor: playerData.map((p) =>
            CHART_COLORS.combatEffectiveness(p.ratio)
          ),
          borderColor: playerData.map((p) => CHART_COLORS.combatEffectiveness(p.ratio))
        }
      ]
    };

    const opts = getHorizontalBarOptions(theme, {
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context: TooltipItem<'bar'>) => {
              const ratio = context.parsed.x;
              return `Ratio: ${ratio}:1`;
            },
            afterLabel: (context: TooltipItem<'bar'>) => {
              const ratio = context.parsed.x;
              if (ratio === null || ratio === undefined) return '';
              if (ratio > 2) return 'Dominant in combat';
              else if (ratio > 1) return 'Offensive fighter';
              else if (ratio >= 0.5) return 'Balanced combatant';
              else return 'Defensive/Cautious';
            }
          }
        }
      }
    });

    return { chartData: data, options: opts, playerData };
  }, [allPlayers, theme]);

  if (!chartData) {
    return (
      <ThemedCard>
        <CardHeader title="Damage Ratio (Dealt : Taken)" />
        <CardContent>
          <Typography variant="body2" color="textSecondary">No combat data available</Typography>
        </CardContent>
      </ThemedCard>
    );
  }

  const maxValue = Math.max(...playerData.map((p) => p.ratio), 1);

  const ratioLabel = (ratio: number) => {
    if (ratio > 2) return 'Dominant';
    if (ratio > 1) return 'Offensive';
    if (ratio >= 0.5) return 'Balanced';
    return 'Defensive';
  };

  return (
    <ThemedCard>
      <CardHeader
        title="Damage Ratio (Dealt : Taken)"
        subheader="How effectively each player engages in combat"
        action={
          <Tooltip title={viewMode === 'chart' ? 'Table view' : 'Chart view'}>
            <IconButton
              size="small"
              sx={{ opacity: 0.5 }}
              onClick={() => setViewMode(viewMode === 'chart' ? 'table' : 'chart')}
            >
              {viewMode === 'chart' ? (
                <TableChartIcon fontSize="small" />
              ) : (
                <BarChartIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        }
      />
      <CardContent sx={{ pt: 0 }}>
        {viewMode === 'chart' ? (
          <Box sx={{ height: 400 }}>
            <Bar data={chartData} options={options} />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Player</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }} align="right">Ratio</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Rating</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', width: '30%' }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {playerData.map((row) => (
                <TableRow key={row.name} hover>
                  <TableCell>
                    <Typography variant="body2">
                      <PlayerLink playerId={Object.entries(allPlayers).find(([, p]) => (p.name || '') === row.name)?.[0] ?? ''}>
                        {row.name}
                      </PlayerLink>
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {row.ratio}:1
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: CHART_COLORS.combatEffectiveness(row.ratio) }}>
                      {ratioLabel(row.ratio)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ height: 8, borderRadius: 1, backgroundColor: CHART_COLORS.combatEffectiveness(row.ratio), width: `${(row.ratio / maxValue) * 100}%`, opacity: 0.8 }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </ThemedCard>
  );
};
