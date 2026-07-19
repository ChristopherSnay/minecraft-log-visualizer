import BarChartIcon from '@mui/icons-material/BarChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import {
  Box,
  Card,
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
import { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { getHorizontalBarOptions } from '../utils/chartOptions';
import { PlayerLink } from './PlayerLink';

interface PlayerRow {
  playerId: string;
  name: string;
  value: number;
}

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
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

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

  const maxValue = rows[0]?.value ?? 1;

  return (
    <Card elevation={1} sx={{ border: (t) => `1px solid ${t.palette.divider}` }}>
      <CardHeader
        title={title}
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
          <Box sx={{ height: 220 }}>
            <Bar data={chartData} options={options} />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  Player
                </TableCell>
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
                <TableRow key={row.name} hover>
                  <TableCell>
                    <Typography variant="body2">
                      <PlayerLink playerId={row.playerId}>{row.name}</PlayerLink>
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
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
        )}
      </CardContent>
    </Card>
  );
}
