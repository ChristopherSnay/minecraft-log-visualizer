import { Card, type CardProps } from '@mui/material';

export function ThemedCard({ elevation = 1, sx, ...props }: CardProps) {
  return (
    <Card
      elevation={elevation}
      sx={{
        border: (theme) => `1px solid ${theme.palette.divider}`,
        ...sx
      }}
      {...props}
    />
  );
}
