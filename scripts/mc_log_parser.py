#!/usr/bin/env python3
"""
mc_log_parser.py

Parses vanilla Minecraft Java server logs (rotated .log.gz files + the live
latest.log) into a single JSON stats file (playtime, deaths, advancements,
and a time-bucketed activity timeline) for rendering into a dashboard.

USAGE
    python mc_log_parser.py logs/*.log.gz logs/latest.log -o site/

    # If latest.log's date can't be inferred correctly, set it explicitly:
    python mc_log_parser.py logs/*.log.gz logs/latest.log -o site/ --latest-date 2026-07-18

WHAT IT READS
    Rotated logs are expected to be named like Mojang's default rotation
    scheme: YYYY-MM-DD-N.log.gz (the date is parsed out of the filename).
    Any file not matching that pattern -- e.g. latest.log -- is treated as
    "today" by default: same date as the most recent rotated log if its
    first timestamp is earlier than that log's last timestamp (implying a
    midnight rollover), otherwise the same date. Override with --latest-date.

OUTPUT
    <outdir>/stats.json  -- structured data. Render it into a dashboard with
                             scripts/render.js (see package.json "deploy" script).
"""

import argparse
import gzip
import json
import re
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------

LINE_RE = re.compile(r"^\[(\d{2}:\d{2}:\d{2})\] \[([^/\]]+)/(\w+)\]:\s?(.*)$")

JOIN_RE = re.compile(r"^(\w{1,16}) joined the game$")
LEAVE_RE = re.compile(r"^(\w{1,16}) left the game$")
ADVANCEMENT_RE = re.compile(r"^(\w{1,16}) has made the advancement \[(.+)\]$")
CHALLENGE_RE = re.compile(r"^(\w{1,16}) has completed the challenge \[(.+)\]$")
GOAL_RE = re.compile(r"^(\w{1,16}) has reached the goal \[(.+)\]$")

DEATH_MARKERS = [
    "was slain by", "was shot by", "was pummeled by", "was fireballed by",
    "was killed by", "was killed while", "was killed trying",
    "drowned", "died from dehydration", "experienced kinetic energy",
    "blew up", "was blown up by", "was blown from a high place",
    "hit the ground too hard", "fell from a high place", "fell off",
    "fell out of the water", "fell while climbing", "was doomed to fall",
    "was impaled", "was skewered by", "was squashed by",
    "went up in flames", "walked into fire", "burned to death",
    "was burned to a crisp", "went off with a bang", "went with a bang",
    "tried to swim in lava", "discovered the floor was lava",
    "walked into a cactus", "was prickled to death", "was pricked to death",
    "starved to death", "suffocated in a wall", "was squished too much",
    "was squashed too much", "left the confines of this world",
    "was struck by lightning", "was smashed by", "froze to death",
    "was frozen to death", "died because of", "withered away",
    "was stung to death", "was poked to death", "was obliterated by",
    "was flattened by", "was roasted in dragon breath",
    "was killed by even more magic", "was killed by magic", "died",
]
DEATH_LINE_RE = re.compile(r"^(\w{1,16}) (.+)$")

DATED_FILENAME_RE = re.compile(r"(\d{4}-\d{2}-\d{2})-(\d+)_?log")


def is_death_message(rest):
    return any(marker in rest for marker in DEATH_MARKERS)


def open_log(path):
    if path.suffix == ".gz":
        return gzip.open(path, "rt", encoding="utf-8", errors="replace")
    return open(path, "rt", encoding="utf-8", errors="replace")


def file_sort_key(path):
    m = DATED_FILENAME_RE.search(path.name)
    if m:
        return (0, m.group(1), int(m.group(2)))
    return (1, "", 0)


def infer_date_for_file(path, prev_date, prev_last_time, first_event_time, latest_date_override):
    m = DATED_FILENAME_RE.search(path.name)
    if m:
        return m.group(1)
    if latest_date_override:
        return latest_date_override
    if prev_date is None:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if prev_last_time and first_event_time and first_event_time < prev_last_time:
        d = datetime.strptime(prev_date, "%Y-%m-%d") + timedelta(days=1)
        return d.strftime("%Y-%m-%d")
    return prev_date


def parse_files(paths, latest_date_override):
    events = []
    files = sorted(paths, key=file_sort_key)

    prev_date = None
    prev_last_time = None

    for path in files:
        if not path.exists():
            print(f"warning: file not found, skipping: {path}", file=sys.stderr)
            continue

        raw_lines = []
        with open_log(path) as f:
            for line in f:
                raw_lines.append(line.rstrip("\r\n"))

        first_event_time = None
        for line in raw_lines:
            m = LINE_RE.match(line)
            if m:
                first_event_time = m.group(1)
                break

        file_date = infer_date_for_file(path, prev_date, prev_last_time,
                                         first_event_time, latest_date_override)

        last_time_seen = None
        for line in raw_lines:
            m = LINE_RE.match(line)
            if not m:
                continue
            time_str, thread, level, rest = m.groups()
            if thread != "Server thread" or level != "INFO":
                continue
            last_time_seen = time_str

            try:
                dt = datetime.strptime(f"{file_date} {time_str}", "%Y-%m-%d %H:%M:%S")
            except ValueError:
                continue

            if (jm := JOIN_RE.match(rest)):
                events.append({"time": dt, "type": "join", "player": jm.group(1)})
            elif (lm := LEAVE_RE.match(rest)):
                events.append({"time": dt, "type": "leave", "player": lm.group(1)})
            elif (am := ADVANCEMENT_RE.match(rest)):
                events.append({"time": dt, "type": "advancement", "player": am.group(1),
                                "name": am.group(2), "kind": "advancement"})
            elif (chm := CHALLENGE_RE.match(rest)):
                events.append({"time": dt, "type": "advancement", "player": chm.group(1),
                                "name": chm.group(2), "kind": "challenge"})
            elif (gm := GOAL_RE.match(rest)):
                events.append({"time": dt, "type": "advancement", "player": gm.group(1),
                                "name": gm.group(2), "kind": "goal"})
            else:
                dmatch = DEATH_LINE_RE.match(rest)
                if dmatch and is_death_message(dmatch.group(2)):
                    events.append({"time": dt, "type": "death", "player": dmatch.group(1),
                                    "message": rest})

        if first_event_time:
            prev_date = file_date
            prev_last_time = last_time_seen or prev_last_time

    events.sort(key=lambda e: e["time"])
    return events


# ---------------------------------------------------------------------------
# Timeline binning (for the activity histogram)
# ---------------------------------------------------------------------------

def compute_timeline(events, range_start, range_end):
    """Bucket join/death/advancement events over time for a histogram.

    Uses hourly buckets when the log range spans <= 48 hours, otherwise
    falls back to daily buckets so the chart doesn't get overcrowded.
    """
    if not events:
        return []

    span_hours = (range_end - range_start).total_seconds() / 3600
    if span_hours <= 48:
        bucket_delta = timedelta(hours=1)
        bucket_anchor = range_start.replace(minute=0, second=0, microsecond=0)
    else:
        bucket_delta = timedelta(days=1)
        bucket_anchor = range_start.replace(hour=0, minute=0, second=0, microsecond=0)

    bucket_seconds = bucket_delta.total_seconds()

    def bucket_key(t):
        idx = int((t - bucket_anchor).total_seconds() // bucket_seconds)
        return bucket_anchor + idx * bucket_delta

    bins = {}
    for e in events:
        if e["type"] not in ("join", "death", "advancement"):
            continue
        key = bucket_key(e["time"])
        b = bins.setdefault(key, {"joins": 0, "deaths": 0, "advancements": 0})
        if e["type"] == "join":
            b["joins"] += 1
        elif e["type"] == "death":
            b["deaths"] += 1
        elif e["type"] == "advancement":
            b["advancements"] += 1

    return [
        {"bucket_start": key.isoformat(), **bins[key]}
        for key in sorted(bins.keys())
    ]


# ---------------------------------------------------------------------------
# Aggregation
# ---------------------------------------------------------------------------

def build_stats(events):
    players = defaultdict(lambda: {
        "playtime_seconds": 0,
        "sessions": [],
        "deaths": [],
        "advancements": [],
        "first_seen": None,
        "last_seen": None,
    })
    open_sessions = {}

    if events:
        range_start = events[0]["time"]
        range_end = events[-1]["time"]
    else:
        range_start = range_end = datetime.now(timezone.utc)

    def touch(player, t):
        p = players[player]
        if p["first_seen"] is None or t < p["first_seen"]:
            p["first_seen"] = t
        if p["last_seen"] is None or t > p["last_seen"]:
            p["last_seen"] = t

    for e in events:
        if e["type"] == "join":
            touch(e["player"], e["time"])
            t = e["time"]
            if e["player"] in open_sessions:
                start = open_sessions.pop(e["player"])
                dur = int((t - start).total_seconds())
                players[e["player"]]["sessions"].append({
                    "join": start.isoformat(), "leave": t.isoformat(),
                    "duration_seconds": dur, "ongoing": False,
                })
                players[e["player"]]["playtime_seconds"] += dur
            open_sessions[e["player"]] = t
        elif e["type"] == "leave":
            touch(e["player"], e["time"])
            t = e["time"]
            if e["player"] in open_sessions:
                start = open_sessions.pop(e["player"])
                dur = int((t - start).total_seconds())
                players[e["player"]]["sessions"].append({
                    "join": start.isoformat(), "leave": t.isoformat(),
                    "duration_seconds": dur, "ongoing": False,
                })
                players[e["player"]]["playtime_seconds"] += dur
        elif e["type"] == "advancement":
            touch(e["player"], e["time"])
            players[e["player"]]["advancements"].append({
                "time": e["time"].isoformat(), "name": e["name"], "kind": e["kind"],
            })
        elif e["type"] == "death":
            touch(e["player"], e["time"])
            players[e["player"]]["deaths"].append({
                "time": e["time"].isoformat(), "message": e["message"],
            })

    for player, start in open_sessions.items():
        dur = int((range_end - start).total_seconds())
        players[player]["sessions"].append({
            "join": start.isoformat(), "leave": None,
            "duration_seconds": dur, "ongoing": True,
        })
        players[player]["playtime_seconds"] += dur

    final_players = {}
    for name, p in players.items():
        final_players[name] = {
            **p,
            "first_seen": p["first_seen"].isoformat() if p["first_seen"] else None,
            "last_seen": p["last_seen"].isoformat() if p["last_seen"] else None,
        }

    totals = {
        "total_playtime_seconds": sum(p["playtime_seconds"] for p in final_players.values()),
        "unique_players": len(final_players),
        "total_deaths": sum(len(p["deaths"]) for p in final_players.values()),
        "total_advancements": sum(len(p["advancements"]) for p in final_players.values()),
    }

    timeline = compute_timeline(events, range_start, range_end)

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "date_range": {
            "start": range_start.isoformat() if events else None,
            "end": range_end.isoformat() if events else None,
        },
        "players": final_players,
        "timeline": timeline,
        "totals": totals,
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                      formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("logs", nargs="+", help="Log files to parse (.log or .log.gz)")
    parser.add_argument("-o", "--outdir", default="site", help="Output directory (default: site/)")
    parser.add_argument("--latest-date", default=None,
                         help="YYYY-MM-DD date to assume for files without a dated filename "
                              "(e.g. latest.log). Overrides auto-inference.")
    args = parser.parse_args()

    paths = [Path(p) for p in args.logs]
    events = parse_files(paths, args.latest_date)

    if not events:
        print("warning: no gameplay events found in the given logs", file=sys.stderr)

    stats = build_stats(events)

    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    (outdir / "stats.json").write_text(json.dumps(stats, indent=2))

    print(f"Parsed {len(events)} events across {len(paths)} file(s).")
    print(f"Players: {stats['totals']['unique_players']}, "
          f"Deaths: {stats['totals']['total_deaths']}, "
          f"Advancements: {stats['totals']['total_advancements']}, "
          f"Timeline buckets: {len(stats['timeline'])}")
    print(f"Wrote {outdir / 'stats.json'}")


if __name__ == "__main__":
    main()
