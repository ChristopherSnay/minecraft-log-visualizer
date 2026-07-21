import React from 'react';

import { PlayerFavorites } from './PlayerFavorites';
import { ResponsiveGrid } from './SectionHeading';
import { ThemedSection } from './ThemedSection';
import type { PlayerStats } from '../types';

interface PlayerFavoritesSectionProps {
  players: Record<string, PlayerStats>;
}

export const PlayerFavoritesSection: React.FC<PlayerFavoritesSectionProps> = ({ players }) => {
  return (
    <ThemedSection title="Player Favorites">
      <ResponsiveGrid columns={2}>
        <PlayerFavorites
          allPlayers={players}
          title="Favorite Item"
          subtitle="Most used item by each player"
          dataKey="items_used"
          colorIndex={0}
        />
        <PlayerFavorites
          allPlayers={players}
          title="Favorite Mob... to Kill"
          subtitle="Most killed mob by each player"
          dataKey="mobs_killed"
          colorIndex={1}
        />
        <PlayerFavorites
          allPlayers={players}
          title="Favorite Block"
          subtitle="Most mined block by each player"
          dataKey="blocks_mined"
          colorIndex={2}
        />
        <PlayerFavorites
          allPlayers={players}
          title="Favorite Craft"
          subtitle="Most crafted item by each player"
          dataKey="items_crafted"
          colorIndex={3}
        />
      </ResponsiveGrid>
    </ThemedSection>
  );
};
