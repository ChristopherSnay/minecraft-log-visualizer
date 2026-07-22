#!/usr/bin/env python3
"""Post-collection script that builds player sessions from raw log events.

Reads stats.json, pairs join/leave events into sessions, fixes consecutive
joins (reconnects), and writes pre-computed structures so the frontend
doesn't need any login-logout matching logic.

Only events within the last 24 hours (relative to captured_at) are kept.
"""

import json
import os
from datetime import datetime, timedelta, timezone

WINDOW_HOURS = 24


def parse_ts(ts):
    """Parse an ISO timestamp string, returning a timezone-aware datetime."""
    # Handle timestamps without explicit timezone (assume UTC)
    dt = datetime.fromisoformat(ts)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def within_window(ts, cutoff):
    """Return True if ts is within the time window (>= cutoff)."""
    return parse_ts(ts) >= cutoff


def fix_consecutive_joins(events):
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


def build_sessions(events):
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
            while leave_idx < len(leaves) and leaves[leave_idx] <= login_time:
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

    sessions.sort(key=lambda s: s["login_time"], reverse=True)
    return sessions


def build_deaths(events):
    """Extract death events into a clean list."""
    return sorted(
        [
            {
                "player": e["player"],
                "message": e["message"],
                "timestamp": e["timestamp"],
            }
            for e in events
            if e["type"] == "death" and e.get("timestamp")
        ],
        key=lambda d: d["timestamp"],
    )


def main():
    stats_path = os.path.join("public", "data", "stats.json")
    if not os.path.isfile(stats_path):
        print(f"No stats.json found at {stats_path}")
        return

    with open(stats_path) as f:
        data = json.load(f)

    captured_at = data.get("captured_at")
    if not captured_at:
        print("No captured_at in stats.json")
        return

    cutoff = parse_ts(captured_at) - timedelta(hours=WINDOW_HOURS)

    events = data.get("logs", {}).get("events", [])
    if not events:
        print("No events in stats.json")
        return

    # Fix consecutive joins (reconnects without leave)
    synthetic = fix_consecutive_joins(events)
    events.extend(synthetic)

    # Build pre-computed structures
    data["logs"]["player_sessions"] = build_sessions(events)
    data["logs"]["deaths"] = build_deaths(events)

    # Filter everything to the time window
    data["logs"]["player_sessions"] = [
        s for s in data["logs"]["player_sessions"]
        if within_window(s["login_time"], cutoff)
    ]
    data["logs"]["deaths"] = [
        d for d in data["logs"]["deaths"]
        if within_window(d["timestamp"], cutoff)
    ]
    data["logs"]["crashes"] = [
        c for c in data["logs"].get("crashes", [])
        if within_window(c["timestamp"], cutoff)
    ]
    data["logs"]["server_sessions"] = [
        s for s in data["logs"].get("server_sessions", [])
        if within_window(s["startTime"], cutoff)
    ]

    # Drop raw events and old session counts (no longer needed by frontend)
    data["logs"].pop("events", None)
    data["logs"].pop("sessions", None)

    with open(stats_path, "w") as f:
        json.dump(data, f, indent=2)

    n = len(data["logs"]["player_sessions"])
    print(
        f"Built {n} player sessions "
        f"(+ {len(synthetic)} synthetic reconnect leaves) "
        f"in last {WINDOW_HOURS}h"
    )


if __name__ == "__main__":
    main()
