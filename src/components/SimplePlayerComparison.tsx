import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';

import { getHorizontalBarOptions } from '../utils/chartOptions';
import type { PlayerRow } from '../utils/chartUtils';
import { ChartWithTable } from './ChartWithTable';
import { PlayerLink } from './PlayerLink';

interface SimplePlayerComparisonProps {
  title: string;
  data: PlayerRow[];
  color: string;
  format?: (value: number) => string;
}

export function SimplePlayerComparison({
  title,
  data,
  color,
  format = (v) => v.toLocaleString()
}: SimplePlayerComparisonProps) {
  const theme = useTheme();

  const rows = useMemo(() => [...data].sort((a, b) => b.value - a.value), [data]);

  const { chartData, options } = useMemo(() => {
    const d = {
      labels: rows.map((r) => r.name),
      datasets: [
        {
          data: rows.map((r) => r.value),
          backgroundColor: color,
          maxBarThickness: 28
        }
      ]
    };

    const opts = getHorizontalBarOptions(theme, {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.parsed.x;
              if (value === null || value === undefined) return '';
              return format(value);
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true
        }
      }
    });

    return { chartData: d, options: opts };
  }, [rows, color, theme, format]);

  if (data.length === 0) {
    return (
      <ChartWithTable
        title={title}
        chartContent={null}
        tableContent={null}
      />
    );
  }

  const maxValue = rows[0]?.value ?? 1;

  return (
    <ChartWithTable
      title={title}
      chartHeight={220}
      chartContent={
        <Bar
          data={chartData}
          options={options}
        />
      }
      tableContent={
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Player</TableCell>
              <TableCell
                sx={{ fontWeight: 600, color: 'text.secondary' }}
                align="right"
              >
                Value
              </TableCell>
              <TableCell
                sx={{ fontWeight: 600, color: 'text.secondary', width: '40%' }}
              ></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.playerId ?? row.name}
                hover
              >
                <TableCell>
                  <Typography variant="body2">
                    {row.playerId ? (
                      <PlayerLink playerId={row.playerId}>{row.name}</PlayerLink>
                    ) : (
                      row.name
                    )}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: 'monospace' }}
                  >
                    {format(row.value)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box
                    sx={{
                      height: 8,
                      borderRadius: 1,
                      backgroundColor: color,
                      width: `${(row.value / maxValue) * 100}%`,
                      opacity: 0.8
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      }
    />
  );
}
