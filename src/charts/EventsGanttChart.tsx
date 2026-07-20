import { Box, CardContent, CardHeader, useTheme } from '@mui/material';
import type { ChartData, ChartOptions, Plugin } from 'chart.js';
import React, { useCallback, useMemo, useRef } from 'react';
import { Bar } from 'react-chartjs-2';

import { ChartEmptyState } from '../components/ChartEmptyState';
import { ThemedCard } from '../components/ThemedCard';
import { getPaletteColor } from '../config/chartColors';
import type { LogDeathEvent, LogJoinEvent, LogLeaveEvent, PlayerStats } from '../types';
import { getAdvancementDisplayName } from '../utils/advancementNames';
import { getBaseChartOptions } from '../utils/chartOptions';
import { getPlayerDisplayName } from '../utils/chartUtils';

interface GanttSession {
  player: string;
  loginHoursAgo: number;
  logoutHoursAgo: number;
  loginTime?: string;
  logoutTime?: string;
}

interface GanttEvent {
  x: number;
  y: string;
  type: 'death' | 'advancement' | 'villager_death';
  detail: string;
  time?: string;
}

interface EventsGanttChartProps {
  allPlayers: Record<string, PlayerStats>;
  deathEvents?: LogDeathEvent[];
  joinEvents?: LogJoinEvent[];
  leaveEvents?: LogLeaveEvent[];
}

const TIME_WINDOW = 12;
const DOT_RADIUS = 5;
const HIT_RADIUS = 8;

const EVENT_COLORS: Record<GanttEvent['type'], string> = {
  death: getPaletteColor(0),
  advancement: getPaletteColor(2),
  villager_death: getPaletteColor(7)
};

const EVENT_TYPE_LABEL: Record<GanttEvent['type'], string> = {
  death: 'Player Death',
  advancement: 'Advancement',
  villager_death: 'Villager Death'
};

function formatTime(time?: string): string {
  if (!time) return '';
  try {
    return new Date(time).toLocaleTimeString();
  } catch {
    return time;
  }
}

export const EventsGanttChart: React.FC<EventsGanttChartProps> = ({
  allPlayers,
  deathEvents,
  joinEvents,
  leaveEvents
}) => {
  const theme = useTheme();
  const tooltipRef = useRef<HTMLDivElement>(null);

  const { chartData, options, ganttEvents, hasEvents } = useMemo(() => {
    const now = new Date();

    const sessions: GanttSession[] = [];
    if (joinEvents && leaveEvents) {
      const playerJoins: Record<string, LogJoinEvent[]> = {};
      const playerLeaves: Record<string, LogLeaveEvent[]> = {};

      joinEvents.forEach((event) => {
        if (event.timestamp) {
          if (!playerJoins[event.player]) playerJoins[event.player] = [];
          playerJoins[event.player].push(event);
        }
      });

      leaveEvents.forEach((event) => {
        if (event.timestamp) {
          if (!playerLeaves[event.player]) playerLeaves[event.player] = [];
          playerLeaves[event.player].push(event);
        }
      });

      Object.keys(playerJoins).forEach((player) => {
        const joins = (playerJoins[player] || [])
          .map((e) => ({ ...e, _time: new Date(e.timestamp!) }))
          .sort((a, b) => a._time.getTime() - b._time.getTime());
        const leaves = (playerLeaves[player] || [])
          .map((e) => ({ ...e, _time: new Date(e.timestamp!) }))
          .sort((a, b) => a._time.getTime() - b._time.getTime());

        let leaveIdx = 0;
        joins.forEach((join) => {
          while (leaveIdx < leaves.length && leaves[leaveIdx]._time <= join._time) {
            leaveIdx++;
          }
          const loginH = (now.getTime() - join._time.getTime()) / (1000 * 60 * 60);
          if (loginH > TIME_WINDOW || loginH < 0) return;

          if (leaveIdx < leaves.length) {
            const logoutH = (now.getTime() - leaves[leaveIdx]._time.getTime()) / (1000 * 60 * 60);
            if (logoutH <= TIME_WINDOW && logoutH >= 0) {
              sessions.push({
                player,
                loginHoursAgo: loginH,
                logoutHoursAgo: logoutH,
                loginTime: join.timestamp,
                logoutTime: leaves[leaveIdx].timestamp
              });
            }
            leaveIdx++;
          } else {
            // No matching leave — player is still online
            sessions.push({
              player,
              loginHoursAgo: loginH,
              logoutHoursAgo: 0,
              loginTime: join.timestamp,
              logoutTime: undefined
            });
          }
        });
      });
    }

    const events: GanttEvent[] = [];

    Object.entries(allPlayers).forEach(([uuid, player]) => {
      const completed = player.completed;
      if (completed && Array.isArray(completed)) {
        completed.forEach((adv) => {
          if (adv.time && !adv.id.includes(':recipes/')) {
            try {
              const advTime = new Date(adv.time);
              const hoursAgo = (now.getTime() - advTime.getTime()) / (1000 * 60 * 60);
              if (hoursAgo <= TIME_WINDOW && hoursAgo >= 0) {
                events.push({
                  x: hoursAgo,
                  y: getPlayerDisplayName(player, uuid),
                  type: 'advancement',
                  detail: getAdvancementDisplayName(adv.id),
                  time: adv.time
                });
              }
            } catch (_e) {
              /* skip */
            }
          }
        });
      }
    });

    if (deathEvents) {
      const knownPlayers = new Set([
        ...Object.entries(allPlayers).map(([uuid, p]) => getPlayerDisplayName(p, uuid))
      ]);

      deathEvents.forEach((event) => {
        if (event.timestamp) {
          try {
            const deathTime = new Date(event.timestamp);
            const hoursAgo = (now.getTime() - deathTime.getTime()) / (1000 * 60 * 60);
            if (hoursAgo <= TIME_WINDOW && hoursAgo >= 0) {
              const isVillager = event.player === 'Villager';
              let targetPlayer = event.player;
              if (isVillager) {
                const byMatch = event.message.match(/\bby\s+(\w+)$/);
                if (byMatch && knownPlayers.has(byMatch[1])) {
                  targetPlayer = byMatch[1];
                } else {
                  targetPlayer = 'Villager';
                }
              }
              events.push({
                x: hoursAgo,
                y: targetPlayer,
                type: isVillager ? 'villager_death' : 'death',
                detail: event.message,
                time: event.timestamp
              });
            }
          } catch (_e) {
            /* skip */
          }
        }
      });
    }

    const hasEvents = sessions.length > 0 || events.length > 0;
    if (!hasEvents) return { chartData: null, options: null, ganttEvents: [], hasEvents: false };

    const hasVillagerDeaths = events.some((e) => e.type === 'villager_death');
    const playerNames = [...new Set([...sessions.map((s) => s.player), ...events.map((e) => e.y)])]
      .filter((n) => n !== 'Villager')
      .sort();
    if (hasVillagerDeaths) playerNames.push('Villager');

    const playerColorMap: Record<string, string> = {};
    playerNames.forEach((name, i) => {
      playerColorMap[name] = getPaletteColor(i);
    });

    const barData = sessions.map((s) => ({
      x: [s.logoutHoursAgo, s.loginHoursAgo] as [number, number],
      y: s.player,
      loginTime: s.loginTime,
      logoutTime: s.logoutTime
    }));

    const barColors = sessions.map((s) => playerColorMap[s.player]);

    const data = {
      datasets: [
        {
          label: 'Sessions',
          data: barData,
          backgroundColor: barColors.map((c) => c + '80'),
          borderColor: barColors,
          borderWidth: 1,
          borderSkipped: false,
          barPercentage: 0.7,
          categoryPercentage: 0.9
        }
      ]
    };

    const opts = getBaseChartOptions(theme, {
      indexAxis: 'y',
      animation: false,
      scales: {
        x: {
          display: true,
          min: 0,
          max: TIME_WINDOW,
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
          type: 'category' as const,
          labels: playerNames
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: true,
          filter: (item) => item.datasetIndex === 0,
          callbacks: {
            title: (items) => {
              const raw = items[0]?.raw as { x: [number, number]; y: string };
              return raw?.y ?? '';
            },
            label: (item) => {
              const raw = item.raw as {
                x: [number, number];
                y: string;
                loginTime?: string;
                logoutTime?: string;
              };
              if (raw?.x) {
                const [start, end] = raw.x;
                const duration = Math.round((end - start) * 10) / 10;
                const h = Math.floor(duration);
                const m = Math.round((duration - h) * 60);
                const durationStr = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
                const loginStr = raw.loginTime
                  ? formatTime(raw.loginTime)
                  : `${Math.round(end * 10) / 10}h ago`;
                const logoutStr = raw.logoutTime
                  ? formatTime(raw.logoutTime)
                  : raw.x[0] === 0
                    ? 'now'
                    : `${Math.round(start * 10) / 10}h ago`;
                return `${loginStr} → ${logoutStr} (${durationStr})`;
              }
              return '';
            }
          }
        }
      }
    }) as ChartOptions;

    return { chartData: data, options: opts, ganttEvents: events, hasEvents };
  }, [allPlayers, deathEvents, joinEvents, leaveEvents, theme]);

  const findNearestEvent = useCallback(
    (
      chart: {
        chartArea: { top: number; bottom: number; left: number; right: number };
        scales: {
          x: { getPixelForValue: (v: number) => number };
          y: { getPixelForValue: (v: string | number) => number };
        };
      },
      eventX: number,
      eventY: number
    ): GanttEvent | null => {
      const xScale = chart.scales.x;
      const yScale = chart.scales.y;
      let nearest: GanttEvent | null = null;
      let minDist = Infinity;

      for (const ge of ganttEvents) {
        const px = xScale.getPixelForValue(ge.x);
        const py = yScale.getPixelForValue(ge.y);
        if (isNaN(px) || isNaN(py)) continue;
        const dist = Math.hypot(px - eventX, py - eventY);
        if (dist < HIT_RADIUS + DOT_RADIUS && dist < minDist) {
          minDist = dist;
          nearest = ge;
        }
      }
      return nearest;
    },
    [ganttEvents]
  );

  if (!hasEvents || !chartData || !options) {
    return <ChartEmptyState title={`Sessions & Events (Last ${TIME_WINDOW} Hours)`} />;
  }

  const eventDotsPlugin: Plugin<'bar'> = {
    id: 'eventDots',
    afterDatasetsDraw(chart) {
      const ctx = chart.ctx;
      const xScale = chart.scales.x;
      const yScale = chart.scales.y as unknown as {
        getPixelForValue: (v: string | number) => number;
      };

      ganttEvents.forEach((event) => {
        const x = xScale.getPixelForValue(event.x);
        const y = yScale.getPixelForValue(event.y);
        if (isNaN(x) || isNaN(y)) return;
        const color = EVENT_COLORS[event.type];

        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = theme.palette.background.paper;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      });
    },
    afterEvent(chart, args) {
      if (!tooltipRef.current) return;
      const evt = args.event as unknown as { x: number; y: number; type: string };
      if (evt.type !== 'mousemove' && evt.type !== 'mouseout') return;

      if (evt.type === 'mouseout') {
        tooltipRef.current.style.display = 'none';
        return;
      }

      const xScale = chart.scales.x;
      const yScale = chart.scales.y as unknown as {
        getPixelForValue: (v: string | number) => number;
      };
      const nearest = findNearestEvent(
        { scales: { x: xScale, y: yScale }, chartArea: chart.chartArea },
        evt.x,
        evt.y
      );
      if (!nearest) {
        tooltipRef.current.style.display = 'none';
        return;
      }

      const tip = tooltipRef.current;
      const timeStr = formatTime(nearest.time);
      const color = EVENT_COLORS[nearest.type];
      const typeLabel = EVENT_TYPE_LABEL[nearest.type];

      tip.innerHTML = `<span style="color:${color};font-weight:600">${typeLabel}</span><br/>${nearest.detail}${timeStr ? `<br/><span style="opacity:0.7">${timeStr}</span>` : ''}`;
      tip.style.display = 'block';

      const canvasRect = (
        chart as unknown as { canvas: HTMLCanvasElement }
      ).canvas.getBoundingClientRect();
      const tipRect = tip.getBoundingClientRect();
      let left = canvasRect.left + evt.x + 12;
      let top = canvasRect.top + evt.y - tipRect.height / 2;

      if (left + tipRect.width > window.innerWidth) {
        left = canvasRect.left + evt.x - tipRect.width - 12;
      }
      if (top < 0) top = 0;
      if (top + tipRect.height > window.innerHeight) {
        top = window.innerHeight - tipRect.height;
      }

      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
    }
  };

  return (
    <ThemedCard elevation={0}>
      <CardHeader
        title={`Sessions & Events (Last ${TIME_WINDOW} Hours)`}
        subheader="Bars = session duration · Dots = events during session"
      />
      <CardContent>
        <Box sx={{ height: 300, position: 'relative' }}>
          <div
            ref={tooltipRef}
            style={{
              display: 'none',
              position: 'fixed',
              zIndex: 1300,
              background: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 4,
              padding: '6px 10px',
              fontSize: 12,
              lineHeight: 1.4,
              pointerEvents: 'none',
              boxShadow: theme.shadows[2],
              maxWidth: 260
            }}
          />
          <Bar
            data={chartData as unknown as ChartData<'bar'>}
            options={
              {
                ...options,
                plugins: {
                  ...options.plugins,
                  eventDots: {}
                }
              } as ChartOptions<'bar'>
            }
            plugins={[eventDotsPlugin]}
          />
        </Box>
      </CardContent>
    </ThemedCard>
  );
};
