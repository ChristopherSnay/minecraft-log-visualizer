import { Box, CardContent, CardHeader } from '@mui/material';
import React, { useMemo } from 'react';
import { StatCard } from './StatCard';
import { ThemedCard } from './ThemedCard';

interface PlaytimeStatsProps {
  customStats: Record<string, number>;
}

interface StatDisplay {
  label: string;
  key: string;
  unit: string;
  format: (value: number) => string;
}

export const PlaytimeStats: React.FC<PlaytimeStatsProps> = ({ customStats }) => {
  const stats: StatDisplay[] = useMemo(
    () => [
      {
        label: 'Playtime',
        key: 'minecraft:play_time',
        unit: 'ticks',
        format: (val) => `${(val / 20 / 3600).toFixed(1)}h`
      },
      {
        label: 'Distance Walked',
        key: 'minecraft:walk_one_cm',
        unit: 'cm',
        format: (val) => `${(val / 100000).toFixed(1)}km`
      },
      {
        label: 'Distance Sprinted',
        key: 'minecraft:sprint_one_cm',
        unit: 'cm',
        format: (val) => `${(val / 100000).toFixed(1)}km`
      },
      {
        label: 'Distance in Boats',
        key: 'minecraft:boat_one_cm',
        unit: 'cm',
        format: (val) => `${(val / 100000).toFixed(1)}km`
      },
      {
        label: 'Distance Swimming',
        key: 'minecraft:swim_one_cm',
        unit: 'cm',
        format: (val) => `${(val / 100000).toFixed(1)}km`
      },
      {
        label: 'Damage Taken',
        key: 'minecraft:damage_taken',
        unit: 'half-hearts',
        format: (val) => `${(val / 2).toFixed(1)}`
      },
      {
        label: 'Damage Dealt',
        key: 'minecraft:damage_dealt',
        unit: 'half-hearts',
        format: (val) => `${(val / 2).toFixed(1)}`
      },
      {
        label: 'Deaths',
        key: 'minecraft:deaths',
        unit: 'count',
        format: (val) => `${val}`
      },
      {
        label: 'Mob Kills',
        key: 'minecraft:mob_kills',
        unit: 'count',
        format: (val) => `${val}`
      },
      {
        label: 'Jumps',
        key: 'minecraft:jump',
        unit: 'count',
        format: (val) => `${val}`
      },
      {
        label: 'Items Enchanted',
        key: 'minecraft:enchant_item',
        unit: 'count',
        format: (val) => `${val}`
      },
      {
        label: 'Animals Bred',
        key: 'minecraft:animals_bred',
        unit: 'count',
        format: (val) => `${val}`
      }
    ],
    []
  );

  return (
    <ThemedCard>
      <CardHeader title="Overall Stats" />
      <CardContent>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
            alignItems: 'stretch',
            gap: 2
          }}
        >
          {stats.map((stat) => {
            const value = customStats[stat.key] ?? 0;
            return (
              <StatCard
                key={stat.key}
                label={stat.label}
                value={stat.format(value)}
                elevation={0}
              />
            );
          })}
        </Box>
      </CardContent>
    </ThemedCard>
  );
};
