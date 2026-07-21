import BarChartIcon from '@mui/icons-material/BarChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import { Box, CardContent, CardHeader, IconButton, Tooltip } from '@mui/material';
import type { ReactNode } from 'react';

import { useChartViewMode } from '../hooks/useChartViewMode';
import { ThemedCard } from './ThemedCard';

interface ChartWithTableProps {
  title: string;
  subheader?: string;
  chartContent: ReactNode;
  tableContent: ReactNode;
  chartHeight?: number;
  actions?: ReactNode;
}

export function ChartWithTable({
  title,
  subheader,
  chartContent,
  tableContent,
  chartHeight = 300,
  actions
}: ChartWithTableProps) {
  const { viewMode, toggleViewMode } = useChartViewMode();

  return (
    <ThemedCard>
      <CardHeader
        title={title}
        subheader={subheader}
        action={
          <>
            {actions}
            <Tooltip title={viewMode === 'chart' ? 'Table view' : 'Chart view'}>
              <IconButton
                size="small"
                sx={{ opacity: 0.5 }}
                onClick={toggleViewMode}
                aria-label="Toggle chart/table view"
              >
                {viewMode === 'chart' ? (
                  <TableChartIcon fontSize="small" />
                ) : (
                  <BarChartIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </>
        }
      />
      <CardContent sx={{ pt: 0 }}>
        {viewMode === 'chart' ? (
          <Box sx={{ height: chartHeight }}>{chartContent}</Box>
        ) : (
          tableContent
        )}
      </CardContent>
    </ThemedCard>
  );
}
