import React from 'react';

import { ActivityMetricsChart } from '../charts/ActivityMetricsChart';
import { BlockCategoriesChart } from '../charts/BlockCategoriesChart';
import { DamageComparisonChart } from '../charts/DamageComparisonChart';
import { DamageRatioChart } from '../charts/DamageRatioChart';
import { EnhancedTravelChart } from '../charts/EnhancedTravelChart';
import { PlayerInteractionsChart } from '../charts/PlayerInteractionsChart';
import { TimeAndSessionsChart } from '../charts/TimeAndSessionsChart';
import type { PlayerStats } from '../types';
import { ResponsiveGrid } from './SectionHeading';
import { ThemedSection } from './ThemedSection';

interface PlayerStatsSectionProps {
  players: Record<string, PlayerStats>;
}

export const PlayerStatsSection: React.FC<PlayerStatsSectionProps> = ({ players }) => {
  return (
    <ThemedSection title="Player Stats">
      <ResponsiveGrid columns={2}>
        <DamageRatioChart allPlayers={players} />
        <DamageComparisonChart allPlayers={players} />
        <TimeAndSessionsChart allPlayers={players} />
        <ActivityMetricsChart allPlayers={players} />
        <EnhancedTravelChart allPlayers={players} />
        <PlayerInteractionsChart allPlayers={players} />
        <BlockCategoriesChart allPlayers={players} />
      </ResponsiveGrid>
    </ThemedSection>
  );
};
