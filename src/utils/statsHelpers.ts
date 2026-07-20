import type { PlayerStats } from '../types';

export interface DerivedPlayerStats {
  name: string;
  playtimeSeconds: number;
  playtimeHours: number;
  totalBlocksMined: number;
  totalItemsCrafted: number;
  totalItemsUsed: number;
  totalMobsKilled: number;
  damageTaken: number;
  sessions: number;
}

export function derivePlayerStats(player: PlayerStats): DerivedPlayerStats {
  // Playtime in ticks (20 ticks = 1 second)
  const playtimeTicks = player.custom_stats['minecraft:total_world_time'] || 0;
  const playtimeSeconds = Math.floor(playtimeTicks / 20);
  const playtimeHours = playtimeSeconds / 3600;

  const totalBlocksMined = Object.values(player.blocks_mined).reduce(
    (sum, count) => sum + count,
    0
  );
  const totalItemsCrafted = player.items_crafted
    ? Object.values(player.items_crafted).reduce((sum, count) => sum + count, 0)
    : 0;
  const totalItemsUsed = player.items_used
    ? Object.values(player.items_used).reduce((sum, count) => sum + count, 0)
    : 0;
  const totalMobsKilled = Object.values(player.mobs_killed).reduce((sum, count) => sum + count, 0);

  const damageTaken = player.custom_stats['minecraft:damage_taken'] || 0;
  const sessions = player.custom_stats['minecraft:leave_game'] || 0;

  return {
    name: player.name,
    playtimeSeconds,
    playtimeHours,
    totalBlocksMined,
    totalItemsCrafted,
    totalItemsUsed,
    totalMobsKilled,
    damageTaken,
    sessions
  };
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function calculateTotals(players: Record<string, PlayerStats>) {
  let totalPlaytimeSeconds = 0;
  let totalBlocksMined = 0;
  let totalItemsCrafted = 0;
  let totalMobsKilled = 0;

  Object.values(players).forEach((player) => {
    const derived = derivePlayerStats(player);
    totalPlaytimeSeconds += derived.playtimeSeconds;
    totalBlocksMined += derived.totalBlocksMined;
    totalItemsCrafted += derived.totalItemsCrafted;
    totalMobsKilled += derived.totalMobsKilled;
  });

  return {
    totalPlaytimeSeconds,
    uniquePlayers: Object.keys(players).length,
    totalBlocksMined,
    totalItemsCrafted,
    totalMobsKilled
  };
}
