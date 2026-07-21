import type { PlayerStats } from '../types';

export function getPlayerDisplayName(player: PlayerStats, playerId: string): string {
  return player.name || playerId.substring(0, 8);
}

export function ticksToHours(ticks: number): number {
  return Math.round((ticks / 20 / 3600) * 10) / 10;
}

export function ticksToMinutes(ticks: number): number {
  return Math.round(ticks / 20 / 60);
}

export function cmToKm(cm: number): number {
  return Math.round((cm / 100000) * 10) / 10;
}

export function damageToHearts(damage: number): number {
  return Math.round((damage / 2) * 10) / 10;
}

export function sumRecord(record: Record<string, number> | undefined): number {
  return record ? Object.values(record).reduce((a, b) => a + b, 0) : 0;
}

export function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export interface PlayerRow {
  playerId?: string;
  name: string;
  value: number;
}

export function buildPlayerRows(
  allPlayers: Record<string, PlayerStats>,
  getValue: (player: PlayerStats, playerId: string) => number,
  opts?: { sortDescending?: boolean }
): PlayerRow[] {
  const sortDesc = opts?.sortDescending !== false;
  const rows = Object.entries(allPlayers).map(([playerId, player]: [string, PlayerStats]) => ({
    playerId,
    name: getPlayerDisplayName(player, playerId),
    value: getValue(player, playerId)
  }));
  return sortDesc ? rows.sort((a, b) => b.value - a.value) : rows;
}

export function mergeRecordsTopN(
  allPlayers: Record<string, PlayerStats>,
  recordKey: keyof Pick<
    PlayerStats,
    | 'blocks_mined'
    | 'items_crafted'
    | 'items_used'
    | 'mobs_killed'
    | 'items_picked_up'
    | 'items_dropped'
  >,
  limit: number,
  labelFn?: (key: string) => string
): PlayerRow[] {
  const merged: Record<string, number> = {};
  Object.values(allPlayers).forEach((player) => {
    const record = player[recordKey];
    if (record) {
      Object.entries(record).forEach(([key, count]) => {
        merged[key] = (merged[key] || 0) + count;
      });
    }
  });
  return Object.entries(merged)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([key, value]) => ({
      name: labelFn ? labelFn(key) : key,
      value
    }));
}
