import type { PlayerStats } from '../types';
import { translateId } from './minecraftTranslations';

export interface ComparisonCategory {
  label: string;
  stats: {
    key: string;
    title: string;
    format?: (v: number) => string;
  }[];
}

function collectKeys(record: Record<string, number> | undefined): string[] {
  if (!record) return [];
  return Object.keys(record).map((k) => k.replace(/^minecraft:/, ''));
}

function collectAdvancementKeys(completed: Array<{ id: string }> | undefined): string[] {
  if (!completed) return [];
  return [...new Set(completed.map((a) => a.id.replace(/^minecraft:/, '')))];
}

export function buildComparisonCategories(
  players: Record<string, PlayerStats>
): ComparisonCategory[] {
  const allPlayers = Object.values(players);

  const blockKeys = new Set<string>();
  const craftedKeys = new Set<string>();
  const usingKeys = new Set<string>();
  const killedKeys = new Set<string>();
  const tookKeys = new Set<string>();
  const droppedKeys = new Set<string>();
  const advancingKeys = new Set<string>();
  const customKeys = new Set<string>();

  for (const p of allPlayers) {
    for (const k of collectKeys(p.blocks_mined)) blockKeys.add(k);
    for (const k of collectKeys(p.items_crafted)) craftedKeys.add(k);
    for (const k of collectKeys(p.items_used)) usingKeys.add(k);
    for (const k of collectKeys(p.mobs_killed)) killedKeys.add(k);
    for (const k of collectKeys(p.items_picked_up)) tookKeys.add(k);
    for (const k of collectKeys(p.items_dropped)) droppedKeys.add(k);
    for (const k of collectAdvancementKeys(p.completed)) advancingKeys.add(k);
    for (const k of collectKeys(p.custom_stats)) customKeys.add(k);
  }

  function toStats(keys: Set<string>, prefix: string) {
    return [...keys]
      .map((k) => ({ key: `${prefix}:${k}`, title: translateId(`minecraft:${k}`) }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  const categories: ComparisonCategory[] = [];

  if (blockKeys.size > 0)
    categories.push({ label: 'Blocks Mined', stats: toStats(blockKeys, 'blocks') });
  if (craftedKeys.size > 0)
    categories.push({ label: 'Items Crafted', stats: toStats(craftedKeys, 'crafted') });
  if (usingKeys.size > 0)
    categories.push({ label: 'Items Used', stats: toStats(usingKeys, 'using') });
  if (killedKeys.size > 0)
    categories.push({ label: 'Mob Kills', stats: toStats(killedKeys, 'killed') });
  if (tookKeys.size > 0)
    categories.push({ label: 'Items Picked Up', stats: toStats(tookKeys, 'took') });
  if (droppedKeys.size > 0)
    categories.push({ label: 'Items Dropped', stats: toStats(droppedKeys, 'dropped') });
  if (advancingKeys.size > 0)
    categories.push({ label: 'Advancements', stats: toStats(advancingKeys, 'advancing') });
  if (customKeys.size > 0)
    categories.push({ label: 'Other', stats: toStats(customKeys, 'custom') });

  return categories;
}
