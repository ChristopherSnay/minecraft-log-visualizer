import {
  Box,
  CardContent,
  CardHeader,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  useMediaQuery,
  useTheme
} from '@mui/material';
import type { ChartData, ChartOptions, Plugin } from 'chart.js';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Bar } from 'react-chartjs-2';

import { ChartEmptyState } from '../components/ChartEmptyState';
import { ThemedCard } from '../components/ThemedCard';
import { getPaletteColor } from '../config/chartColors';
import type {
  DeathEvent,
  LogCrashEvent,
  PlayerSession,
  PlayerStats,
  ServerSession
} from '../types';
import { getBaseChartOptions } from '../utils/chartOptions';
import { getPlayerDisplayName } from '../utils/chartUtils';
import { translateId } from '../utils/minecraftTranslations';

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
  type: 'death' | 'advancement' | 'npc_death' | 'crash';
  detail: string;
  color: string;
  time?: string;
}

interface EventsGanttChartProps {
  allPlayers: Record<string, PlayerStats>;
  playerSessions?: PlayerSession[];
  deaths?: DeathEvent[];
  crashEvents?: LogCrashEvent[];
  serverSessions?: ServerSession[];
  capturedAt?: Date | null;
}

const TIME_WINDOW_OPTIONS = [4, 8, 12, 24] as const;
const DOT_RADIUS = 5;
const HIT_RADIUS = 8;

const DOT_COLORS: Record<GanttEvent['type'], string> = {
  death: '#F44336',
  advancement: '#FFC107',
  npc_death: '',
  crash: ''
};

const EVENT_TYPE_LABEL: Record<GanttEvent['type'], string> = {
  death: 'Player Death',
  advancement: 'Advancement',
  npc_death: 'NPC Death',
  crash: 'Server Crash'
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
  playerSessions,
  deaths,
  crashEvents,
  serverSessions,
  capturedAt
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [timeWindow, setTimeWindow] = useState<number>(isMobile ? 4 : 12);

  const { chartData, options, ganttEvents, hasEvents } = useMemo(() => {
    const now = capturedAt && !isNaN(capturedAt.getTime()) ? capturedAt : new Date();

    // Build GanttSession list from pre-computed player_sessions
    const sessions: GanttSession[] = (playerSessions || [])
      .map((s) => {
        const loginDate = new Date(s.login_time);
        const loginH = (now.getTime() - loginDate.getTime()) / (1000 * 60 * 60);
        if (loginH < 0) return null;

        let logoutH = 0;
        if (s.logout_time) {
          const logoutDate = new Date(s.logout_time);
          logoutH = (now.getTime() - logoutDate.getTime()) / (1000 * 60 * 60);
          if (logoutH < 0) return null;
          if (logoutH > timeWindow) return null;
        }

        return {
          player: s.player,
          loginHoursAgo: loginH,
          logoutHoursAgo: logoutH,
          loginTime: s.login_time,
          logoutTime: s.logout_time
        };
      })
      .filter((s) => s !== null) as GanttSession[];

    // Determine which NPC/Server rows are needed before building color map
    const hasNpcDeaths = deaths?.some((e) => !!e.entity_type) ?? false;
    const hasServerDowntime = (serverSessions?.length ?? 0) > 0;
    const hasCrashEvents = (crashEvents?.length ?? 0) > 0;

    const playerNames = [...new Set(sessions.map((s) => s.player))].sort();
    if (hasNpcDeaths) playerNames.push('NPC');
    if (hasServerDowntime || hasCrashEvents) playerNames.push('Server');

    const playerColorMap: Record<string, string> = {};
    playerNames.forEach((name, i) => {
      playerColorMap[name] = getPaletteColor(i);
    });

    const events: GanttEvent[] = [];
    const dotColor = (type: GanttEvent['type'], rowColor: string) => DOT_COLORS[type] || rowColor;

    Object.entries(allPlayers).forEach(([uuid, player]) => {
      const completed = player.completed;
      if (completed && Array.isArray(completed)) {
        completed.forEach((adv) => {
          if (adv.time && !adv.id.includes(':recipes/')) {
            try {
              const advTime = new Date(adv.time);
              const hoursAgo = (now.getTime() - advTime.getTime()) / (1000 * 60 * 60);
              if (hoursAgo <= timeWindow && hoursAgo >= 0) {
                const name = getPlayerDisplayName(player, uuid);
                events.push({
                  x: hoursAgo,
                  y: name,
                  type: 'advancement',
                  detail: translateId(adv.id),
                  color: dotColor('advancement', playerColorMap[name] ?? getPaletteColor(0)),
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

    if (deaths) {
      deaths.forEach((event) => {
        if (event.timestamp) {
          try {
            const deathTime = new Date(event.timestamp);
            const hoursAgo = (now.getTime() - deathTime.getTime()) / (1000 * 60 * 60);
            if (hoursAgo <= timeWindow && hoursAgo >= 0) {
              const isNpc = !!event.entity_type;
              let targetPlayer = event.player;
              let eventType: GanttEvent['type'] = 'death';
              let detail = event.message;

              if (isNpc) {
                targetPlayer = 'NPC';
                eventType = 'npc_death';
                detail = `${event.entity_type}: ${event.message}`;
              }

              events.push({
                x: hoursAgo,
                y: targetPlayer,
                type: eventType,
                detail,
                color: dotColor(eventType, playerColorMap[targetPlayer] ?? getPaletteColor(0)),
                time: event.timestamp
              });
            }
          } catch (_e) {
            /* skip */
          }
        }
      });
    }

    // Add crash events as dots on the Server row
    if (crashEvents) {
      crashEvents.forEach((event) => {
        try {
          const crashTime = new Date(event.timestamp);
          const hoursAgo = (now.getTime() - crashTime.getTime()) / (1000 * 60 * 60);
          if (hoursAgo <= timeWindow && hoursAgo >= 0) {
            events.push({
              x: hoursAgo,
              y: 'Server',
              type: 'crash',
              detail: 'Server crashed',
              color: dotColor('crash', playerColorMap['Server'] ?? getPaletteColor(0)),
              time: event.timestamp
            });
          }
        } catch (_e) {
          /* skip */
        }
      });
    }

    // Build server downtime bars
    const serverDowntimeData: Array<{
      x: [number, number];
      y: string;
      startTime?: string;
      endTime?: string;
    }> = [];
    if (serverSessions) {
      serverSessions.forEach((ss) => {
        try {
          const start = new Date(ss.startTime);
          const end = new Date(ss.endTime);
          const startH = (now.getTime() - start.getTime()) / (1000 * 60 * 60);
          const endH = (now.getTime() - end.getTime()) / (1000 * 60 * 60);
          if (startH <= timeWindow && startH >= 0) {
            serverDowntimeData.push({
              x: [Math.max(endH, 0), startH],
              y: 'Server',
              startTime: ss.startTime,
              endTime: ss.endTime
            });
          }
        } catch (_e) {
          /* skip */
        }
      });
    }

    const hasEvents = sessions.length > 0 || events.length > 0 || serverDowntimeData.length > 0;
    if (!hasEvents) return { chartData: null, options: null, ganttEvents: [], hasEvents: false };

    const barData = [
      ...sessions.map((s) => ({
        x: [s.logoutHoursAgo, Math.min(s.loginHoursAgo, timeWindow)] as [number, number],
        y: s.player,
        loginTime: s.loginTime,
        logoutTime: s.logoutTime,
        loginHoursAgo: s.loginHoursAgo
      })),
      ...serverDowntimeData
    ];

    const barColors = [
      ...sessions.map((s) => playerColorMap[s.player]),
      ...serverDowntimeData.map(() => playerColorMap['Server'])
    ];

    const data = {
      datasets: [
        {
          label: 'Sessions',
          data: barData,
          backgroundColor: barColors,
          borderSkipped: false,
          barPercentage: 0.8,
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
          max: timeWindow,
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
              const raw = items[0]?.raw as {
                x: [number, number];
                y: string;
                startTime?: string;
              };
              return raw?.startTime ? `Server Downtime` : (raw?.y ?? '');
            },
            label: (item) => {
              const raw = item.raw as {
                x: [number, number];
                y: string;
                loginTime?: string;
                logoutTime?: string;
                startTime?: string;
                endTime?: string;
                loginHoursAgo?: number;
              };
              if (raw?.startTime) {
                // Server downtime
                const [start, end] = raw.x;
                const duration = Math.round((end - start) * 10) / 10;
                const h = Math.floor(duration);
                const m = Math.round((duration - h) * 60);
                const durationStr = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
                const startStr = raw.startTime ? formatTime(raw.startTime) : '';
                const endStr = raw.endTime ? formatTime(raw.endTime) : '';
                return `${startStr} → ${endStr} (${durationStr})`;
              }
              if (raw?.x) {
                const [start, end] = raw.x;
                const actualEnd = raw.loginHoursAgo ?? end;
                const duration = Math.round((actualEnd - start) * 10) / 10;
                const h = Math.floor(duration);
                const m = Math.round((duration - h) * 60);
                const durationStr = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
                const loginStr = raw.loginTime
                  ? formatTime(raw.loginTime)
                  : `${Math.round(actualEnd * 10) / 10}h ago`;
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
  }, [
    allPlayers,
    playerSessions,
    deaths,
    crashEvents,
    serverSessions,
    capturedAt,
    theme,
    timeWindow
  ]);

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
    return <ChartEmptyState title={`Sessions & Events (Last ${timeWindow} Hours)`} />;
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

        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = event.color;
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
      const typeLabel = EVENT_TYPE_LABEL[nearest.type];

      tip.innerHTML = `<span style="color:${nearest.color};font-weight:600">${typeLabel}</span><br/>${nearest.detail}${timeStr ? `<br/><span style="opacity:0.7">${timeStr}</span>` : ''}`;
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
    <ThemedCard elevation={1}>
      <CardHeader
        title={`Sessions & Events (Last ${timeWindow} Hours)`}
        subheader="Bars = session duration · Dots = events during session"
      />
      <Box sx={{ px: 2, pb: 1, display: 'flex', justifyContent: 'flex-end' }}>
        <FormControl
          size="small"
          sx={{ minWidth: 90 }}
        >
          <InputLabel id="time-window-label">Hours</InputLabel>
          <Select
            labelId="time-window-label"
            value={timeWindow}
            label="Hours"
            onChange={(e) => setTimeWindow(e.target.value as number)}
          >
            {TIME_WINDOW_OPTIONS.map((h) => (
              <MenuItem
                key={h}
                value={h}
              >
                {h}h
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <CardContent>
        <Box sx={{ height: 350, position: 'relative' }}>
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
            key={timeWindow}
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
