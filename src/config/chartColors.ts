/**
 * Global chart color palettes
 * Centralized color definitions to ensure consistency across all charts
 */

export const CHART_COLORS = {
  // Event timeline colors
  events: {
    deaths: '#FF6B6B',
    mobKills: '#9D84B7',
    advancements: '#FFD93D'
  },

  // Travel methods colors
  travel: {
    walk: '#8884d8',
    sprint: '#82ca9d',
    boat: '#ffc658',
    swim: '#0088FE',
    climb: '#ff7c7c'
  },

  // Block categories colors
  blockCategories: {
    oresAndMinerals: '#FF6B6B',
    buildingMaterials: '#4ECDC4',
    stoneAndRock: '#95A5A6',
    woodAndLogs: '#8B4513',
    decorativeAndOther: '#9D84B7'
  },

  // Generic palette for multi-series charts (MUI Material colors, ordered by hue)
  palette: [
    '#F44336', // Red
    '#FF9800', // Orange
    '#FFC107', // Amber
    '#8BC34A', // Light Green
    '#009688', // Teal
    '#00BCD4', // Cyan
    '#2196F3', // Blue
    '#3F51B5', // Indigo
    '#9C27B0', // Purple
    '#E91E63'  // Pink
  ],

  // Combat effectiveness (for damage ratio)
  combatEffectiveness: (ratio: number) => {
    if (ratio > 2) return '#66BB6A'; // success - dominant
    if (ratio > 1) return '#42A5F5'; // info - offensive
    if (ratio >= 0.5) return '#FFA726'; // warning - balanced
    return '#EF5350'; // error - defensive
  }
};

/**
 * Get a color from the palette by index
 * Useful for cycling through colors when rendering multiple items
 */
export const getPaletteColor = (index: number): string => {
  return CHART_COLORS.palette[index % CHART_COLORS.palette.length];
};

/**
 * Generate dataset colors with optional opacity
 * Returns backgroundColor and borderColor for Chart.js datasets
 */
export const getDatasetColors = (index: number, opacity = 1) => {
  const baseColor = getPaletteColor(index);
  return {
    backgroundColor:
      opacity < 1
        ? `${baseColor}${Math.round(opacity * 255)
            .toString(16)
            .padStart(2, '0')}`
        : baseColor,
    borderColor: baseColor
  };
};

/**
 * Travel method labels and corresponding colors
 */
export const TRAVEL_METHODS = {
  walk: { label: 'Walk', color: CHART_COLORS.travel.walk },
  sprint: { label: 'Sprint', color: CHART_COLORS.travel.sprint },
  boat: { label: 'Boat', color: CHART_COLORS.travel.boat },
  swim: { label: 'Swim', color: CHART_COLORS.travel.swim },
  climb: { label: 'Climb', color: CHART_COLORS.travel.climb }
} as const;

/**
 * Block category labels and colors
 */
export const BLOCK_CATEGORIES_COLORS = {
  'Ores & Minerals': CHART_COLORS.blockCategories.oresAndMinerals,
  'Building Materials': CHART_COLORS.blockCategories.buildingMaterials,
  'Stone & Rock': CHART_COLORS.blockCategories.stoneAndRock,
  'Wood & Logs': CHART_COLORS.blockCategories.woodAndLogs,
  'Decorative & Other': CHART_COLORS.blockCategories.decorativeAndOther
};
