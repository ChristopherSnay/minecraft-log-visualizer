/**
 * Global chart color palettes
 * Centralized color definitions to ensure consistency across all charts
 */

export const CHART_COLORS = {
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
    '#E91E63' // Pink
  ]
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
