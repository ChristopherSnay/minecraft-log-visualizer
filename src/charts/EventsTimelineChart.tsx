import { Box, CardContent, CardHeader, Typography, useTheme } from '@mui/material';
import type { ChartOptions } from 'chart.js';
import React, { useMemo } from 'react';
import { Scatter } from 'react-chartjs-2';
import { ThemedCard } from '../components/ThemedCard';
import { getPaletteColor } from '../config/chartColors';
import type { LogDeathEvent, LogJoinEvent, LogLeaveEvent, PlayerStats } from '../types';
import { getAdvancementDisplayName } from '../utils/advancementNames';
import { getBaseChartOptions } from '../utils/chartOptions';

interface EventPoint {
  x: number;
  y: number;
  player: string;
  detail: string;
  time?: string;
}

interface SessionLine {
  player: string;
  loginHoursAgo: number;
  logoutHoursAgo: number;
  loginIdx: number;
  logoutIdx: number;
  deathIdxs: number[];
}

interface EventsTimelineChartProps {
  allPlayers: Record<string, PlayerStats>;
  deathEvents?: LogDeathEvent[];
  joinEvents?: LogJoinEvent[];
  leaveEvents?: LogLeaveEvent[];
}

export const EventsTimelineChart: React.FC<EventsTimelineChartProps> = ({
  allPlayers,
  deathEvents,
  joinEvents,
  leaveEvents
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
                  detail: advName,
                  time: adv.time
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
                detail: event.message,
                time: event.timestamp
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

    // Collect login timestamps (with index tracking for jitter alignment)
    const loginPoints: Array<EventPoint & { _idx: number }> = [];
    if (joinEvents) {
      joinEvents.forEach((event, i) => {
        if (event.timestamp) {
          try {
            const joinTime = new Date(event.timestamp);
            const hoursAgo = (now.getTime() - joinTime.getTime()) / (1000 * 60 * 60);
            if (hoursAgo <= 12 && hoursAgo >= 0) {
              loginPoints.push({
                x: hoursAgo,
                y: 5,
                player: event.player,
                detail: 'joined',
                _idx: i,
                time: event.timestamp
              });
            }
          } catch (_e) {
            // Skip invalid timestamps
          }
        }
      });
    }

    // Collect logout timestamps (with index tracking for jitter alignment)
    const logoutPoints: Array<EventPoint & { _idx: number }> = [];
    if (leaveEvents) {
      leaveEvents.forEach((event, i) => {
        if (event.timestamp) {
          try {
            const leaveTime = new Date(event.timestamp);
            const hoursAgo = (now.getTime() - leaveTime.getTime()) / (1000 * 60 * 60);
            if (hoursAgo <= 12 && hoursAgo >= 0) {
              logoutPoints.push({
                x: hoursAgo,
                y: 7,
                player: event.player,
                detail: 'left',
                _idx: i,
                time: event.timestamp
              });
            }
          } catch (_e) {
            // Skip invalid timestamps
          }
        }
      });
    }

    // Match join/leave events into sessions, tracking array indices
    const sessions: SessionLine[] = [];
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
          if (leaveIdx < leaves.length) {
            const loginHoursAgo = (now.getTime() - join._time.getTime()) / (1000 * 60 * 60);
            const logoutHoursAgo = (now.getTime() - leaves[leaveIdx]._time.getTime()) / (1000 * 60 * 60);
            if (loginHoursAgo <= 12 && loginHoursAgo >= 0 && logoutHoursAgo <= 12 && logoutHoursAgo >= 0) {
              const loginIdx = loginPoints.findIndex(
                (lp) => lp.player === player && Math.abs(lp.x - loginHoursAgo) < 0.001
              );
              const logoutIdx = logoutPoints.findIndex(
                (lp) => lp.player === player && Math.abs(lp.x - logoutHoursAgo) < 0.001
              );
              // Find player deaths (not villagers) within this session window
              const deathIdxs = playerDeathPoints
                .map((dp, i) => ({ dp, i }))
                .filter(({ dp }) => dp.player === player && dp.x <= loginHoursAgo && dp.x >= logoutHoursAgo)
                .map(({ i }) => i);
              if (loginIdx >= 0 && logoutIdx >= 0) {
                sessions.push({ player, loginHoursAgo, logoutHoursAgo, loginIdx, logoutIdx, deathIdxs });
              }
            }
            leaveIdx++;
          }
        });
      });
    }

    const hasEvents = advancementPoints.length > 0 || playerDeathPoints.length > 0 || villagerDeathPoints.length > 0 || loginPoints.length > 0 || logoutPoints.length > 0 || sessions.length > 0;

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

    const loginWithJitter = loginPoints.map((p) => ({
      x: p.x,
      y: 5 + (seededRandom(p._idx * 456) * 0.3 - 0.15),
      player: p.player,
      detail: p.detail,
      time: p.time
    }));

    const logoutWithJitter = logoutPoints.map((p) => ({
      x: p.x,
      y: 7 + (seededRandom(p._idx * 123) * 0.3 - 0.15),
      player: p.player,
      detail: p.detail,
      time: p.time
    }));

    // Build session line datasets using the same jitter as the dots they connect
    const sessionColor = getPaletteColor(9);
    const sessionDatasets = sessions.map((s) => {
      const loginY = 5 + (seededRandom(loginPoints[s.loginIdx]._idx * 456) * 0.3 - 0.15);
      const logoutY = 7 + (seededRandom(logoutPoints[s.logoutIdx]._idx * 123) * 0.3 - 0.15);
      const points: Array<{ x: number; y: number; player: string; detail: string; time?: string }> = [
        { x: s.loginHoursAgo, y: loginY, player: s.player, detail: 'joined', time: loginPoints[s.loginIdx].time }
      ];
      s.deathIdxs.forEach((di) => {
        const dp = playerDeathPoints[di];
        const deathY = 3 + (seededRandom(di * 789) * 0.3 - 0.15);
        points.push({ x: dp.x, y: deathY, player: dp.player, detail: dp.detail, time: dp.time });
      });
      points.push({ x: s.logoutHoursAgo, y: logoutY, player: s.player, detail: 'left', time: logoutPoints[s.logoutIdx].time });
      return {
        data: points,
        showLine: true,
        borderColor: sessionColor,
        backgroundColor: sessionColor,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 0,
        tension: 0,
        order: 2,
        tooltip: { enabled: false }
      };
    });

    const data = {
      datasets: [
        ...sessionDatasets,
        {
          label: `Player Deaths (${playerDeathsWithJitter.length})`,
          data: playerDeathsWithJitter,
          backgroundColor: getPaletteColor(0),
          borderColor: getPaletteColor(0),
          pointRadius: 4,
          pointHoverRadius: 6,
          order: 1
        },
        {
          label: `Villager Deaths (${villagerDeathsWithJitter.length})`,
          data: villagerDeathsWithJitter,
          backgroundColor: getPaletteColor(7),
          borderColor: getPaletteColor(7),
          pointRadius: 4,
          pointHoverRadius: 6,
          order: 1
        },
        {
          label: `Advancements (${advWithJitter.length})`,
          data: advWithJitter,
          backgroundColor: getPaletteColor(2),
          borderColor: getPaletteColor(2),
          pointRadius: 4,
          pointHoverRadius: 6,
          order: 1
        },
        {
          label: `Logins (${loginWithJitter.length})`,
          data: loginWithJitter,
          backgroundColor: getPaletteColor(3),
          borderColor: getPaletteColor(3),
          pointRadius: 4,
          pointHoverRadius: 6,
          order: 1
        },
        {
          label: `Logouts (${logoutWithJitter.length})`,
          data: logoutWithJitter,
          backgroundColor: getPaletteColor(5),
          borderColor: getPaletteColor(5),
          pointRadius: 4,
          pointHoverRadius: 6,
          order: 1
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
          max: 8,
          ticks: {
            stepSize: 2,
            callback: (value) => {
              if (value === 1) return 'Advancements';
              if (value === 3) return 'Deaths';
              if (value === 5) return 'Logins';
              if (value === 7) return 'Logouts';
              return '';
            }
          }
        }
      },
      plugins: {
        legend: {
          labels: {
            filter: (item) => {
              const ds = item.datasetIndex != null ? data.datasets[item.datasetIndex] : undefined;
              return !(ds && 'showLine' in ds && ds.showLine);
            }
          }
        },
        tooltip: {
          enabled: true,
          filter: (item) => {
            const ds = item.datasetIndex != null ? data.datasets[item.datasetIndex] : undefined;
            return !(ds && 'showLine' in ds && ds.showLine);
          },
          callbacks: {
            title: (items) => {
              const raw = items[0]?.raw as EventPoint;
              if (raw?.time) {
                try {
                  const d = new Date(raw.time);
                  return d.toLocaleTimeString();
                } catch {
                  return raw.time;
                }
              }
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
  }, [allPlayers, deathEvents, joinEvents, leaveEvents, theme]);

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
          <Scatter data={chartData as any} options={options} />
        </Box>
      </CardContent>
    </ThemedCard>
  );
};
