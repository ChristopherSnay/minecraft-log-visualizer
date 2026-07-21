import { Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';

import { ChartEmptyState } from '../components/ChartEmptyState';
import { ChartWithTable } from '../components/ChartWithTable';
import { getPaletteColor } from '../config/chartColors';
import { getPieChartOptions } from '../utils/chartOptions';
import { getItemName } from '../utils/itemNames';

interface MobsKilledChartProps {
  mobs: Record<string, number>;
}

export const MobsKilledChart: React.FC<MobsKilledChartProps> = ({ mobs }) => {
  const theme = useTheme();

  const { chartData, options, mobData } = useMemo(() => {
    if (!mobs || Object.keys(mobs).length === 0) {
      return { chartData: null, options: null, mobData: [] };
    }

    const mobData = Object.entries(mobs)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({
        name: getItemName(name),
        value: count
      }));

    if (mobData.length === 0) {
      return { chartData: null, options: null, mobData: [] };
    }

    const data = {
      labels: mobData.map((m) => m.name),
      datasets: [
        {
          label: 'Kills',
          data: mobData.map((m) => m.value),
          backgroundColor: mobData.map((_, index) => getPaletteColor(index)),
          borderColor: theme.palette.background.paper
        }
      ]
    };

    const opts = getPieChartOptions(theme, {});

    return { chartData: data, options: opts, mobData };
  }, [mobs, theme]);

  if (!chartData) {
    return <ChartEmptyState title="Mobs Killed" />;
  }

  return (
    <ChartWithTable
      title="Mobs Killed"
      chartHeight={300}
      chartContent={
        <Doughnut
          data={chartData}
          options={options}
        />
      }
      tableContent={
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Mob</TableCell>
              <TableCell
                sx={{ fontWeight: 600, color: 'text.secondary' }}
                align="right"
              >
                Kills
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {mobData.map((row) => (
              <TableRow
                key={row.name}
                hover
              >
                <TableCell>
                  <Typography variant="body2">{row.name}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: 'monospace' }}
                  >
                    {row.value.toLocaleString()}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      }
    />
  );
};
