import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import React, { useMemo, useState } from 'react';
import type { PlayerStats } from '../types';
import { getAdvancementDisplayName } from '../utils/advancementNames';

type SortColumn = 'advancement' | 'date';
type SortOrder = 'asc' | 'desc';

interface PlayerAdvancementsProps {
  playerStats: PlayerStats;
}

export const PlayerAdvancements: React.FC<PlayerAdvancementsProps> = ({
  playerStats
}) => {
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const advancements = useMemo(() => {
    if (!playerStats.completed) return [];

    const filtered = playerStats.completed.filter((adv) => !adv.id.includes(':recipes/'));

    return filtered.sort((a, b) => {
      if (sortColumn === 'advancement') {
        const nameA = getAdvancementDisplayName(a.id).toLowerCase();
        const nameB = getAdvancementDisplayName(b.id).toLowerCase();
        const comparison = nameA.localeCompare(nameB);
        return sortOrder === 'desc' ? -comparison : comparison;
      } else {
        if (!a.time) return 1;
        if (!b.time) return -1;
        const comparison = new Date(b.time).getTime() - new Date(a.time).getTime();
        return sortOrder === 'desc' ? -comparison : comparison;
      }
    });
  }, [playerStats.completed, sortColumn, sortOrder]);

  const handleHeaderClick = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortOrder('desc');
    }
  };

  if (advancements.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No advancements completed yet.
      </Typography>
    );
  }

  const formatDate = (time: string | null) => {
    if (!time) return 'Unknown';
    try {
      return new Date(time).toLocaleString();
    } catch {
      return time;
    }
  };

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow
            sx={{
              backgroundColor: (theme) =>
                theme.palette.mode === 'dark' ? '#2a2a2a' : '#f5f5f5'
            }}
          >
            <TableCell
              onClick={() => handleHeaderClick('advancement')}
              sx={{
                fontWeight: 900,
                fontSize: '0.95rem',
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'background-color 0.2s',
                '&:hover': {
                  backgroundColor: (theme) =>
                    theme.palette.mode === 'dark' ? '#383838' : '#eeeeee'
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Advancement
                {sortColumn === 'advancement' && (
                  <Typography variant="caption" sx={{ ml: 0.5 }}>
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </Typography>
                )}
              </Box>
            </TableCell>
            <TableCell
              align="right"
              onClick={() => handleHeaderClick('date')}
              sx={{
                fontWeight: 900,
                fontSize: '0.95rem',
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'background-color 0.2s',
                '&:hover': {
                  backgroundColor: (theme) =>
                    theme.palette.mode === 'dark' ? '#383838' : '#eeeeee'
                }
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 1
                }}
              >
                Date Accomplished
                {sortColumn === 'date' && (
                  <Typography variant="caption" sx={{ ml: 0.5 }}>
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </Typography>
                )}
              </Box>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {advancements.map((adv) => (
            <TableRow key={adv.id}>
              <TableCell>
                <Typography variant="body2">
                  {getAdvancementDisplayName(adv.id)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" color="text.secondary">
                  {formatDate(adv.time)}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
