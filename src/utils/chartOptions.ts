import type { Theme } from '@mui/material/styles';
import type { ChartOptions, ScaleOptions } from 'chart.js';

/**
 * Shallow-merge two scale objects so custom options add to rather than replace base config.
 */
function mergeScales(
  base: Record<string, ScaleOptions>,
  custom?: Record<string, ScaleOptions>
): Record<string, ScaleOptions> {
  if (!custom) return base;
  const result: Record<string, ScaleOptions> = { ...base };
  for (const [key, value] of Object.entries(custom)) {
    result[key] = {
      ...(result[key] as Record<string, unknown>),
      ...value
    } as ScaleOptions;
  }
  return result;
}

/**
 * Generate Chart.js options that are theme-aware and match MUI styling.
 * Only functional customizations: dark mode colors and font family.
 */
export const getBaseChartOptions = (
  theme: Theme,
  customOptions?: Partial<ChartOptions>
): ChartOptions => {
  const textColor = theme.palette.text.primary;
  const secondaryTextColor = theme.palette.text.secondary;
  const gridColor = theme.palette.divider;

  const baseOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: textColor,
          font: {
            family: theme.typography.fontFamily
          }
        }
      },
      tooltip: {
        backgroundColor: theme.palette.background.paper,
        titleColor: textColor,
        bodyColor: secondaryTextColor,
        borderColor: gridColor,
        borderWidth: 1
      }
    },
    scales: {
      x: {
        ticks: {
          color: secondaryTextColor,
          font: {
            family: theme.typography.fontFamily
          }
        },
        grid: {
          color: gridColor,
          drawOnChartArea: true
        }
      },
      y: {
        ticks: {
          color: secondaryTextColor,
          font: {
            family: theme.typography.fontFamily
          }
        },
        grid: {
          color: gridColor,
          drawOnChartArea: true
        }
      }
    }
  };

  if (!customOptions) return baseOptions;

  const { scales: customScales, ...rest } = customOptions;

  return {
    ...baseOptions,
    ...rest,
    scales: mergeScales(
      baseOptions.scales as Record<string, ScaleOptions>,
      customScales as Record<string, ScaleOptions>
    )
  } as ChartOptions;
};

/**
 * Get options for horizontal bar charts
 */
export const getHorizontalBarOptions = (
  theme: Theme,
  customOptions?: Partial<ChartOptions<'bar'>>
): ChartOptions<'bar'> => {
  const base = getBaseChartOptions(theme);
  if (!customOptions) {
    return { ...base, indexAxis: 'y' as const } as ChartOptions<'bar'>;
  }
  const { scales: customScales, ...rest } = customOptions;
  return {
    ...base,
    ...rest,
    indexAxis: 'y' as const,
    scales: mergeScales(
      base.scales as Record<string, ScaleOptions>,
      customScales as Record<string, ScaleOptions>
    )
  } as ChartOptions<'bar'>;
};

/**
 * Get options for pie/doughnut charts
 */
export const getPieChartOptions = (
  theme: Theme,
  customOptions?: Partial<ChartOptions<'doughnut'>>
): ChartOptions<'doughnut'> => {
  const textColor = theme.palette.text.primary;
  const bgColor = theme.palette.background.paper;
  const gridColor = theme.palette.divider;

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: textColor,
          font: {
            family: theme.typography.fontFamily
          }
        }
      },
      tooltip: {
        backgroundColor: bgColor,
        titleColor: textColor,
        bodyColor: theme.palette.text.secondary,
        borderColor: gridColor,
        borderWidth: 1
      }
    },
    ...customOptions
  } as ChartOptions<'doughnut'>;
};

/**
 * Get options for line/area charts
 */
export const getLineChartOptions = (
  theme: Theme,
  customOptions?: Partial<ChartOptions<'line'>>
): ChartOptions<'line'> => {
  const base = getBaseChartOptions(theme);
  if (!customOptions) return base as ChartOptions<'line'>;
  const { scales: customScales, ...rest } = customOptions;
  return {
    ...base,
    ...rest,
    scales: mergeScales(
      base.scales as Record<string, ScaleOptions>,
      customScales as Record<string, ScaleOptions>
    )
  } as ChartOptions<'line'>;
};
