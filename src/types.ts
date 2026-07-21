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
  completed?: Array<{ id: string; time: string | null }>;
  in_progress?: Array<{ id: string; time: string | null }>;
  position?: { x: number; y: number; z: number };
  dimension?: string;
  xp?: number;
  health?: number;
  food?: number;
  saturation?: number;
  inventory?: Array<{ id: string; count: number; slot: number }>;
  effects?: Array<{ id: string; amplifier: number; duration: number }>;
}

export interface LogJoinEvent {
  type: 'join';
  player: string;
  timestamp?: string;
  line: string;
}

export interface LogLeaveEvent {
  type: 'leave';
  player: string;
  timestamp?: string;
  line?: string;
  synthetic?: boolean;
  reason?: string;
}

export interface LogDeathEvent {
  type: 'death';
  player: string;
  message: string;
  timestamp: string;
  line: string;
}

export interface LogCrashEvent {
  type: 'crash';
  timestamp: string;
}

export interface ServerSession {
  startTime: string;
  endTime: string;
}

export type LogEvent = LogJoinEvent | LogLeaveEvent | LogDeathEvent;

export interface StatsJson {
  captured_at?: string;
  stats: {
    players: Record<string, PlayerStats>;
  };
  logs?: {
    events: LogEvent[];
    crashes?: LogCrashEvent[];
    server_sessions?: ServerSession[];
  };
}
