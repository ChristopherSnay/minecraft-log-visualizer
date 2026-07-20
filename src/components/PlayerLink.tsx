import { Link } from '@mui/material';
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

interface PlayerLinkProps {
  playerId: string;
  children: React.ReactNode;
}

export const PlayerLink: React.FC<PlayerLinkProps> = ({ playerId, children }) => (
  <Link
    component={RouterLink}
    to={`/player/${playerId}`}
    sx={{ fontWeight: 'inherit' }}
  >
    {children}
  </Link>
);
