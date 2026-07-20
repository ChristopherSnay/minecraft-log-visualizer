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
import React, { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { getPaletteColor } from '../config/chartColors';
import { useChartViewMode } from '../hooks/useChartViewMode';
import type { PlayerStats } from '../types';
import { getPieChartOptions } from '../utils/chartOptions';

interface BlockCategoriesChartProps {
  allPlayers: Record<string, PlayerStats>;
}

const BLOCK_CATEGORIES: Record<string, string[]> = {
  'Ores & Minerals': [
    'coal_ore',
    'copper_ore',
    'diamond_ore',
    'emerald_ore',
    'gold_ore',
    'iron_ore',
    'lapis_ore',
    'nether_gold_ore',
    'nether_quartz_ore',
    'redstone_ore',
    'deepslate_coal_ore',
    'deepslate_copper_ore',
    'deepslate_diamond_ore',
    'deepslate_emerald_ore',
    'deepslate_gold_ore',
    'deepslate_iron_ore',
    'deepslate_lapis_ore',
    'deepslate_redstone_ore',
    'amethyst_block',
    'budding_amethyst'
  ],
  'Building Materials': [
    'oak_planks',
    'spruce_planks',
    'birch_planks',
    'jungle_planks',
    'dark_oak_planks',
    'acacia_planks',
    'cherry_planks',
    'mangrove_planks',
    'glass',
    'stone_bricks',
    'sand',
    'gravel',
    'dirt',
    'grass_block',
    'cobblestone',
    'stone',
    'mud',
    'clay',
    'terracotta',
    'white_terracotta',
    'orange_terracotta',
    'yellow_terracotta'
  ],
  'Stone & Rock': [
    'deepslate',
    'stone',
    'diorite',
    'andesite',
    'granite',
    'calcite',
    'cobblestone',
    'mossy_cobblestone',
    'cobbled_deepslate',
    'basalt',
    'smooth_basalt',
    'blackstone'
  ],
  'Wood & Logs': [
    'oak_log',
    'spruce_log',
    'birch_log',
    'jungle_log',
    'dark_oak_log',
    'acacia_log',
    'cherry_log',
    'mangrove_log',
    'oak_leaves',
    'spruce_leaves',
    'birch_leaves',
    'jungle_leaves',
    'dark_oak_leaves',
    'acacia_leaves',
    'cherry_leaves',
    'mangrove_leaves'
  ],
  'Decorative & Other': [
    'torch',
    'lantern',
    'sea_lantern',
    'glowstone',
    'chest',
    'furnace',
    'crafting_table',
    'bed',
    'banner',
    'fence',
    'door',
    'stairs',
    'slab'
  ]
};

export const BlockCategoriesChart: React.FC<BlockCategoriesChartProps> = ({
  allPlayers
}) => {
  const theme = useTheme();
  const { viewMode, toggleViewMode } = useChartViewMode();

  const { chartData, options, categoryData } = useMemo(() => {
    const categoryCounts: Record<string, number> = {};

    // Initialize categories
    Object.keys(BLOCK_CATEGORIES).forEach((cat) => {
      categoryCounts[cat] = 0;
    });

    // Count blocks in each category
    Object.values(allPlayers).forEach((player: PlayerStats) => {
      if (player.blocks_mined) {
        Object.entries(player.blocks_mined).forEach(([block, count]: [string, number]) => {
          const cleanBlock = block.replace('minecraft:', '');
          for (const [category, blocks] of Object.entries(BLOCK_CATEGORIES)) {
            if (blocks.some((b) => cleanBlock.includes(b))) {
              categoryCounts[category] += count;
              break;
            }
          }
        });
      }
    });

    const categoryData = Object.entries(categoryCounts)
      .filter(([, count]) => count > 0)
      .map(([name, value]) => ({
        name,
        value
      }));

    const data = {
      labels: categoryData.map((c) => c.name),
      datasets: [
        {
          label: 'Blocks Mined',
          data: categoryData.map((c) => c.value),
          backgroundColor: categoryData.map((_, index) => getPaletteColor(index)),
          borderColor: theme.palette.background.paper
        }
      ]
    };

    const opts = getPieChartOptions(theme, {});

    return { chartData: data, options: opts, categoryData };
  }, [allPlayers, theme]);

  if (!chartData) {
    return (
      <ThemedCard>
        <CardHeader title="Blocks Mined by Category" />
        <CardContent>
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">
              No data available
            </Typography>
          </Box>
        </CardContent>
      </ThemedCard>
    );
  }

  const totalBlocks = categoryData.reduce((sum, c) => sum + c.value, 0);
  const maxValue = categoryData[0]?.value ?? 1;

  return (
    <ThemedCard>
      <CardHeader
        title="Blocks Mined by Category"
        action={
          <Tooltip title={viewMode === 'chart' ? 'Table view' : 'Chart view'}>
            <IconButton size="small" sx={{ opacity: 0.5 }} onClick={toggleViewMode}>
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
          <Box sx={{ height: 300 }}>
            <Doughnut data={chartData} options={options} />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }} align="right">Count</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }} align="right">%</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', width: '30%' }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categoryData.map((cat, i) => (
                <TableRow key={cat.name} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: getPaletteColor(i), flexShrink: 0 }} />
                      <Typography variant="body2">{cat.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {cat.value.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                      {((cat.value / totalBlocks) * 100).toFixed(1)}%
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ height: 8, borderRadius: 1, backgroundColor: getPaletteColor(i), width: `${(cat.value / maxValue) * 100}%`, opacity: 0.8 }} />
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
