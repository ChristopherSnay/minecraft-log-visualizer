import { Card, type CardProps } from '@mui/material';

export function ThemedCard({ sx, ...props }: CardProps) {
  return (
    <Card
      elevation={1}
      sx={{
        border: (theme) => `1px solid ${theme.palette.divider}`,
        ...sx
      }}
      {...props}
    />
  );
}
