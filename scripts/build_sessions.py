#!/usr/bin/env python3
"""Builds player sessions, deaths, crashes, and server sessions from raw
log data parsed by collectors/logs.py.

Called from mc_world_parser.py after collect_logs(). Receives log_data
(raw events + file end states + captured_at), does ALL reconstruction in a
single pass, and returns pre-computed structures for the frontend.
"""

from datetime import datetime, timedelta, timezone

WINDOW_HOURS = 24


def parse_ts(ts):
    """Parse an ISO timestamp string, returning a timezone-aware datetime."""
    dt = datetime.fromisoformat(ts)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def within_window(ts, cutoff):
    """Return True if ts is within the time window (>= cutoff)."""
    return parse_ts(ts) >= cutoff


def _fix_consecutive_joins(events):
    """Insert synthetic leaves when a player joins while already online."""
    events_sorted = sorted(events, key=lambda e: e.get("timestamp", ""))

    online = {}
    synthetic = []
    for e in events_sorted:
        p = e.get("player")
        if not p:
            continue
        if e["type"] == "join":
            if online.get(p):
                synthetic.append({
                    "type": "leave",
                    "player": p,
                    "timestamp": e.get("timestamp"),
                    "line": e.get("line", ""),
                    "synthetic": True,
                    "reason": "reconnect",
                })
            online[p] = True
        elif e["type"] == "leave":
            online[p] = False
    return synthetic


def _pair_sessions(events):
    """Pair join/leave events into player sessions.

    Returns a list of {player, login_time, logout_time} dicts.
    logout_time is None if the player is still online.
    """
    by_player = {}
    for e in events:
        p = e.get("player")
        if not p:
            continue
        by_player.setdefault(p, {"joins": [], "leaves": []})
        if e["type"] == "join" and e.get("timestamp"):
            by_player[p]["joins"].append(e["timestamp"])
        elif e["type"] == "leave" and e.get("timestamp"):
            by_player[p]["leaves"].append(e["timestamp"])

    sessions = []
    for player, data in by_player.items():
        joins = sorted(data["joins"])
        leaves = sorted(data["leaves"])
        leave_idx = 0
        for login_time in joins:
            while leave_idx < len(leaves) and leaves[leave_idx] < login_time:
                leave_idx += 1
            if leave_idx < len(leaves):
                logout_time = leaves[leave_idx]
                leave_idx += 1
            else:
                logout_time = None
            sessions.append({
                "player": player,
                "login_time": login_time,
                "logout_time": logout_time,
            })

    by_name = {}
    for s in sessions:
        by_name.setdefault(s["player"], []).append(s)
    for player_sessions in by_name.values():
        player_sessions.sort(key=lambda s: s["login_time"])
        for i in range(len(player_sessions) - 1):
            cur = player_sessions[i]
            nxt = player_sessions[i + 1]
            if cur["logout_time"] is None:
                cur["logout_time"] = nxt["login_time"]
            elif cur["logout_time"] > nxt["login_time"]:
                cur["logout_time"] = nxt["login_time"]

    sessions.sort(key=lambda s: s["login_time"], reverse=True)
    return sessions


def _extract_deaths(events):
    """Extract death events into a clean list, sorted chronologically."""
    return sorted(
        [
            {
                "player": e["player"],
                "message": e["message"],
                "timestamp": e["timestamp"],
                **({"entity_type": e["entity_type"]} if e.get("entity_type") else {}),
            }
            for e in events
            if e["type"] == "death" and e.get("timestamp")
        ],
        key=lambda d: d["timestamp"],
    )


def _merge_adjacent_sessions(player_sessions):
    """Merge consecutive sessions for the same player that are close in time.

    Handles log-rotation artifacts where a player's continuous session is
    split into two (e.g. server restart or log rotation at midnight).
    Sessions closer than 2 minutes apart are merged.
    """
    by_name = {}
    for s in player_sessions:
        by_name.setdefault(s["player"], []).append(s)

    for ps in by_name.values():
        merged = []
        for session in ps:
            if merged:
                prev = merged[-1]
                if prev.get("logout_time") and session.get("login_time"):
                    gap = parse_ts(session["login_time"]) - parse_ts(prev["logout_time"])
                    if 0 < gap.total_seconds() < 120:
                        prev["logout_time"] = session.get("logout_time") or session["login_time"]
                        continue
            merged.append(session)
        ps[:] = merged

    merged = []
    for ps in by_name.values():
        merged.extend(ps)
    merged.sort(key=lambda s: s["login_time"], reverse=True)
    return merged


def build_sessions(log_data, captured_at):
    """Build all pre-computed log structures from raw events and file states.

    Args:
        log_data: dict with "events" (list of raw event dicts) and "files"
                  (list of file end-state dicts). Each file dict has keys:
                  is_latest, had_stop, last_timestamp, online_players,
                  server_start_time, pause_sessions.
        captured_at: ISO timestamp string for the 24h window anchor.

    Returns:
        dict with player_sessions, deaths, crashes, server_sessions.
    """
    events = log_data.get("events", [])
    files = log_data.get("files", [])

    # ── 1. File-boundary synthetic leaves ──
    # When a rotated log ends without "Stopping server" and players are still
    # online, inject a leave event — but only if the next file shows evidence
    # of a server restart (has a "Done" / server_start_time). If the next file
    # lacks a restart signal, the log was rotated externally while the server
    # kept running; players were never disconnected.
    # The latest.log (current session) is always skipped.
    extra_events = []
    for i, f in enumerate(files):
        if f.get("is_latest"):
            continue
        if not f["had_stop"] and f["online_players"] and f["last_timestamp"]:
            next_file_restarted = (
                i + 1 < len(files)
                and files[i + 1].get("server_start_time") is not None
            )
            if next_file_restarted:
                for player in f["online_players"]:
                    extra_events.append({
                        "type": "leave",
                        "player": player,
                        "timestamp": f["last_timestamp"],
                        "synthetic": True,
                        "reason": "server_restart",
                    })

    # ── 2. Fix consecutive joins (reconnects) ──
    all_events = events + extra_events
    all_events.extend(_fix_consecutive_joins(all_events))

    # ── 3. Build player sessions ──
    player_sessions = _pair_sessions(all_events)

    # ── 4. Merge adjacent sessions ──
    player_sessions = _merge_adjacent_sessions(player_sessions)

    # ── 5. Build deaths ──
    deaths = _extract_deaths(events)

    # ── 6. Filter to 24h window ──
    cutoff = parse_ts(captured_at) - timedelta(hours=WINDOW_HOURS)

    def _session_overlaps(s, cutoff):
        return within_window(s["login_time"], cutoff) or (
            s.get("logout_time") is not None and within_window(s["logout_time"], cutoff)
        )

    player_sessions = [s for s in player_sessions if _session_overlaps(s, cutoff)]
    deaths = [
        d for d in deaths
        if within_window(d["timestamp"], cutoff)
    ]

    # ── 7. Crashes ──
    # A crash is only flagged for a rotated file that ends with players online
    # AND has no next file at all (orphaned log — server never came back).
    crashes = []
    for i, f in enumerate(files):
        if f.get("is_latest"):
            continue
        if not f["had_stop"] and f["online_players"] and f["last_timestamp"]:
            next_exists = i + 1 < len(files)
            if not next_exists:
                crashes.append({"type": "crash", "timestamp": f["last_timestamp"]})
    crashes = [c for c in crashes if within_window(c["timestamp"], cutoff)]

    # ── 8. Server sessions ──
    server_sessions = []
    for f in files:
        server_sessions.extend(f.get("pause_sessions", []))

    # Crash restarts
    for crash in crashes:
        restart_time = None
        for f in files:
            if f["server_start_time"] and f["server_start_time"] > crash["timestamp"]:
                restart_time = f["server_start_time"]
                break
        if restart_time:
            server_sessions.append({
                "startTime": crash["timestamp"],
                "endTime": restart_time,
            })

    # Graceful stop -> restart
    for i, f in enumerate(files):
        if f["had_stop"] and f["last_timestamp"] and i + 1 < len(files):
            next_start = files[i + 1]["server_start_time"]
            if next_start:
                server_sessions.append({
                    "startTime": f["last_timestamp"],
                    "endTime": next_start,
                })

    server_sessions = [
        s for s in server_sessions
        if within_window(s["startTime"], cutoff)
    ]

    return {
        "player_sessions": player_sessions,
        "deaths": deaths,
        "crashes": crashes,
        "server_sessions": server_sessions,
    }
