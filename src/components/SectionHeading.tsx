import { Box, Typography } from '@mui/material';
import React from 'react';

interface SectionHeadingProps {
  children: React.ReactNode;
  sx?: object;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({ children, sx }) => (
  <Typography
    variant="h6"
    sx={{
      fontSize: '1.05rem',
      mt: 4,
      mb: 1.5,
      pb: 0.5,
      borderBottom: 1,
      borderColor: 'divider',
      ...sx
    }}
  >
    {children}
  </Typography>
);

interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  gap?: number;
  mb?: number;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns = 2,
  gap = 2,
  mb = 3
}) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: `repeat(${columns}, 1fr)` },
      gap,
      mb
    }}
  >
    {children}
  </Box>
);
