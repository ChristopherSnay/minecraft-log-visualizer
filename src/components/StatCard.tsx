import { type SxProps, type Theme, Typography } from '@mui/material';

import { ThemedCard } from './ThemedCard';

interface StatCardProps {
  value: string | number;
  label: string;
  onClick?: () => void;
  sx?: SxProps<Theme>;
  elevation?: number;
}

export function StatCard({ value, label, onClick, sx, elevation = 2 }: StatCardProps) {
  return (
    <ThemedCard
      elevation={elevation}
      onClick={onClick}
      sx={{
        p: 1.5,
        textAlign: 'center',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s',
        '&:hover': onClick ? { borderColor: (theme) => theme.palette.primary.main } : undefined,
        ...sx
      }}
    >
      <Typography
        variant="h4"
        sx={{
          fontSize: '1.4rem',
          fontWeight: 700,
          color: (theme) => theme.palette.primary.main,
          mb: 0.5
        }}
      >
        {value}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          fontSize: '0.72rem',
          color: 'text.secondary',
          textTransform: 'uppercase',
          letterSpacing: '0.04em'
        }}
      >
        {label}
      </Typography>
    </ThemedCard>
  );
}
