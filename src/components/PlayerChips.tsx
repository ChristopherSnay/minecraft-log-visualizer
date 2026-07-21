import { Box, Chip } from '@mui/material';
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { getPaletteColor } from '../config/chartColors';
import type { PlayerStats } from '../types';
import { getPlayerDisplayName } from '../utils/chartUtils';

interface PlayerChipsProps {
  players: Record<string, PlayerStats>;
  expanded: boolean;
}

export const PlayerChips: React.FC<PlayerChipsProps> = ({ players, expanded }) => {
  if (!expanded) return null;

  const entries = Object.entries(players);

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1, mb: 2 }}>
      {entries.map(([id, p], i) => (
        <Chip
          key={id}
          component={RouterLink}
          to={`/player/${id}`}
          label={getPlayerDisplayName(p, id)}
          clickable
          variant="outlined"
          sx={{
            fontWeight: 500,
            borderWidth: 4,
            borderColor: getPaletteColor(i),
            color: getPaletteColor(i),
            '&:hover': { backgroundColor: `${getPaletteColor(i)}14` }
          }}
        />
      ))}
    </Box>
  );
};
