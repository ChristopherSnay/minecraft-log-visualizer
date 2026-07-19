/**
 * Groupings of Minecraft custom_stats into meaningful categories, plus
 * helpers for rendering friendly labels. Used by the per-player polar area
 * charts that compare a player's stats against the server average.
 */

export const CUSTOM_STAT_CATEGORIES: Record<string, string[]> = {
  Movement: [
    'minecraft:walk_one_cm',
    'minecraft:sprint_one_cm',
    'minecraft:crouch_one_cm',
    'minecraft:fly_one_cm',
    'minecraft:swim_one_cm',
    'minecraft:boat_one_cm',
    'minecraft:climb_one_cm',
    'minecraft:fall_one_cm',
    'minecraft:dive_one_cm',
    'minecraft:horse_one_cm',
    'minecraft:minecart_one_cm',
    'minecraft:strider_one_cm',
    'minecraft:elytra_one_cm',
    'minecraft:walk_on_water_one_cm',
    'minecraft:jump'
  ],
  Combat: [
    'minecraft:mob_kills',
    'minecraft:deaths',
    'minecraft:damage_dealt',
    'minecraft:damage_taken',
    'minecraft:player_kills',
    'minecraft:animals_bred'
  ],
  'Crafting & Interaction': [
    'minecraft:interact_with_crafting_table',
    'minecraft:interact_with_furnace',
    'minecraft:interact_with_blast_furnace',
    'minecraft:interact_with_smoker',
    'minecraft:interact_with_anvil',
    'minecraft:interact_with_loom',
    'minecraft:interact_with_cartography_table',
    'minecraft:interact_with_grindstone',
    'minecraft:interact_with_smithing_table',
    'minecraft:interact_with_stonecutter',
    'minecraft:interact_with_lectern',
    'minecraft:enchant_item',
    'minecraft:open_chest',
    'minecraft:open_ender_chest',
    'minecraft:open_barrel',
    'minecraft:open_shulker_box',
    'minecraft:trigger_trapped_chest',
    'minecraft:inspect_dispenser',
    'minecraft:inspect_hopper',
    'minecraft:inspect_dropper'
  ],
  'Time & Rest': [
    'minecraft:play_time',
    'minecraft:leave_game',
    'minecraft:time_since_death',
    'minecraft:time_since_rest',
    'minecraft:sleep_in_bed'
  ],
  Misc: [
    'minecraft:drop',
    'minecraft:traded_with_villager',
    'minecraft:talked_to_villager',
    'minecraft:fish_caught',
    'minecraft:pot_flower',
    'minecraft:bell_ring',
    'minecraft:eat_cake_slice',
    'minecraft:fill_cauldron',
    'minecraft:use_cauldron',
    'minecraft:target_hit',
    'minecraft:break_item',
    'minecraft:clean_armor',
    'minecraft:play_noteblock',
    'minecraft:tune_noteblock'
  ]
};

/** Convert a stat key like "minecraft:walk_one_cm" into "Walk One Cm". */
export function getStatLabel(key: string): string {
  const name = key.replace(/^minecraft:/, '');
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Return only the categories that have at least one stat present in the
 * given custom_stats record, with their present stat keys.
 */
export function getPresentCategories(
  customStats: Record<string, number>
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [category, keys] of Object.entries(CUSTOM_STAT_CATEGORIES)) {
    const present = keys.filter((key) => key in customStats);
    if (present.length > 0) {
      result[category] = present;
    }
  }
  return result;
}
