import { Box, CardContent, CardHeader, Typography, useTheme } from '@mui/material';
import { ThemedCard } from '../components/ThemedCard';
import type { ChartOptions } from 'chart.js';
import React, { useMemo } from 'react';
import { Scatter } from 'react-chartjs-2';
import { getPaletteColor } from '../config/chartColors';
import type { LogDeathEvent, PlayerStats } from '../types';
import { getAdvancementDisplayName } from '../utils/advancementNames';
import { getBaseChartOptions } from '../utils/chartOptions';

interface EventPoint {
  x: number;
  y: number;
  player: string;
  detail: string;
}

interface EventsTimelineChartProps {
  allPlayers: Record<string, PlayerStats>;
  deathEvents?: LogDeathEvent[];
}

export const EventsTimelineChart: React.FC<EventsTimelineChartProps> = ({
  allPlayers,
  deathEvents
}) => {
  const theme = useTheme();

  const { chartData, options, hasEvents } = useMemo(() => {
    const now = new Date();

    // Collect advancement timestamps with player names
    const advancementPoints: EventPoint[] = [];

    Object.entries(allPlayers).forEach(([uuid, player]) => {
      const completed = player.completed;
      if (completed && Array.isArray(completed)) {
        completed.forEach((adv) => {
          if (adv.time && !adv.id.includes(':recipes/')) {
            try {
              const advTime = new Date(adv.time);
              const hoursAgo = (now.getTime() - advTime.getTime()) / (1000 * 60 * 60);
              if (hoursAgo <= 12 && hoursAgo >= 0) {
                const advName = getAdvancementDisplayName(adv.id);
                advancementPoints.push({
                  x: hoursAgo,
                  y: 1,
                  player: player.name || uuid.substring(0, 8),
                  detail: advName
                });
              }
            } catch (_e) {
              // Skip invalid timestamps
            }
          }
        });
      }
    });

    // Collect death timestamps from log events, split villagers from players
    const playerDeathPoints: EventPoint[] = [];
    const villagerDeathPoints: EventPoint[] = [];

    if (deathEvents) {
      deathEvents.forEach((event) => {
        if (event.timestamp) {
          try {
            const deathTime = new Date(event.timestamp);
            const hoursAgo = (now.getTime() - deathTime.getTime()) / (1000 * 60 * 60);
            if (hoursAgo <= 12 && hoursAgo >= 0) {
              const point: EventPoint = {
                x: hoursAgo,
                y: 3,
                player: event.player,
                detail: event.message
              };
              if (event.player === 'Villager') {
                villagerDeathPoints.push(point);
              } else {
                playerDeathPoints.push(point);
              }
            }
          } catch (_e) {
            // Skip invalid timestamps
          }
        }
      });
    }

    const hasEvents = advancementPoints.length > 0 || playerDeathPoints.length > 0 || villagerDeathPoints.length > 0;

    // Seeded random for consistent jitter
    const seededRandom = (seed: number) => {
      const v = Math.sin(seed) * 10000;
      return v - Math.floor(v);
    };

    // Apply jitter to avoid overlapping points
    const advWithJitter = advancementPoints.map((p, i) => ({
      ...p,
      y: 1 + (seededRandom(i * 901) * 0.3 - 0.15)
    }));

    const playerDeathsWithJitter = playerDeathPoints.map((p, i) => ({
      ...p,
      y: 3 + (seededRandom(i * 789) * 0.3 - 0.15)
    }));

    const villagerDeathsWithJitter = villagerDeathPoints.map((p, i) => ({
      ...p,
      y: 3 + (seededRandom(i * 789 + 500) * 0.3 - 0.15)
    }));

    const data = {
      datasets: [
        {
          label: `Player Deaths (${playerDeathsWithJitter.length})`,
          data: playerDeathsWithJitter,
          backgroundColor: getPaletteColor(0),
          borderColor: getPaletteColor(0),
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: `Villager Deaths (${villagerDeathsWithJitter.length})`,
          data: villagerDeathsWithJitter,
          backgroundColor: getPaletteColor(7),
          borderColor: getPaletteColor(7),
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: `Advancements (${advWithJitter.length})`,
          data: advWithJitter,
          backgroundColor: getPaletteColor(2),
          borderColor: getPaletteColor(2),
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    };

    const opts = getBaseChartOptions(theme, {
      scales: {
        x: {
          display: true,
          min: 0,
          max: 12,
          title: {
            display: true,
            text: 'Hours Ago'
          },
          ticks: {
            stepSize: 1,
            callback: (value) => `${Math.floor(value as number)}h`
          },
          reverse: true
        },
        y: {
          min: 0,
          max: 4,
          ticks: {
            stepSize: 2,
            callback: (value) => {
              if (value === 1) return 'Advancements';
              if (value === 3) return 'Deaths';
              return '';
            }
          }
        }
      },
      plugins: {
        tooltip: {
          enabled: true,
          callbacks: {
            title: (items) => {
              const hoursAgo = items[0]?.parsed.x ?? 0;
              return `${Math.round(hoursAgo * 10) / 10}h ago`;
            },
            label: (item) => {
              const raw = item.raw as EventPoint;
              if (raw.player) {
                return `${raw.player}: ${raw.detail}`;
              }
              return raw.detail;
            }
          }
        }
      }
    }) as ChartOptions<'scatter'>;

    return { chartData: data, options: opts, hasEvents };
  }, [allPlayers, deathEvents, theme]);

  if (!hasEvents) {
    return (
      <ThemedCard>
        <CardHeader title="Recent Events (Last 12 Hours)" />
        <CardContent>
          <Typography variant="body2" color="textSecondary">
            No events recorded yet.
          </Typography>
        </CardContent>
      </ThemedCard>
    );
  }

  return (
    <ThemedCard>
      <CardHeader
        title="Recent Events (Last 12 Hours)"
        subheader="Hover over points for details"
      />
      <CardContent>
        <Box sx={{ height: 300 }}>
          <Scatter data={chartData} options={options} />
        </Box>
      </CardContent>
    </ThemedCard>
  );
};
