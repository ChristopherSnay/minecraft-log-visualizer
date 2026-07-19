// src/types.ts
export interface PlayerStats {
  blocks_mined: Record<string, number>;
  items_crafted?: Record<string, number>;
  items_used?: Record<string, number>;
  mobs_killed: Record<string, number>;
  custom_stats: Record<string, number>;
  items_picked_up: Record<string, number>;
  items_dropped: Record<string, number>;
  name: string;
}

export interface LogDeathEvent {
  type: 'death';
  player: string;
  message: string;
  timestamp: string;
  line: string;
}

export interface StatsJson {
  stats: {
    players: Record<string, PlayerStats>;
  };
  advancements?: {
    players: Record<
      string,
      {
        uuid: string;
        completed: Array<{ id: string; time: string | null }>;
      }
    >;
  };
  logs?: {
    events: LogDeathEvent[];
  };
}
