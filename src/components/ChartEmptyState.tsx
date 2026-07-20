import { CardContent, Typography } from '@mui/material';
import { CardHeader } from '@mui/material';
import { ThemedCard } from './ThemedCard';

interface ChartEmptyStateProps {
  title: string;
}

export function ChartEmptyState({ title }: ChartEmptyStateProps) {
  return (
    <ThemedCard>
      <CardHeader title={title} />
      <CardContent>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No data available
        </Typography>
      </CardContent>
    </ThemedCard>
  );
}
