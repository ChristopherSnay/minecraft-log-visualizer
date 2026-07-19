import gzip
import os
import re
from datetime import datetime

# Regex for log lines
LOG_LINE_REGEX = re.compile(r"^\[(\d{2}:\d{2}:\d{2})\] \[([^\]]+)\]: (.*)$")

# Event type patterns (triple-quoted raw strings to avoid unterminated literals)
JOIN_PAT = re.compile(r"""^(.+) joined the game$""")
LEAVE_PAT = re.compile(r"""^(.+) left the game$""")
DEATH_PAT = re.compile(r"""^(.+) (?:was|fell|drowned|burned|blew up|died).*""")
ADVANCEMENT_PAT = re.compile(r"""^(.+) has made the advancement \[(.+)\]$""")
CHAT_PAT = re.compile(r"""^<(.+)> (.+)$""")
COMMAND_PAT = re.compile(r"""^(.+) issued server command: (.+)$""")


def parse_timestamp(hms):
    """Convert HH:MM:SS into a datetime.time object."""
    try:
        return datetime.strptime(hms, "%H:%M:%S").time()
    except Exception:
        return None


def normalize_event(event_type, player=None, data=None, timestamp=None):
    """Return a normalized event dictionary."""
    return {
        "type": event_type,
        "player": player,
        "data": data or {},
        "timestamp": timestamp.isoformat() if timestamp else None
    }


def parse_line(line):
    """Parse a single log line into a normalized event."""
    match = LOG_LINE_REGEX.match(line)
    if not match:
        return None

    hms, source, message = match.groups()
    timestamp = parse_timestamp(hms)

    # Player join
    m = JOIN_PAT.match(message)
    if m:
        return normalize_event("join", m.group(1), {}, timestamp)

    # Player leave
    m = LEAVE_PAT.match(message)
    if m:
        return normalize_event("leave", m.group(1), {}, timestamp)

    # Death
    m = DEATH_PAT.match(message)
    if m:
        return normalize_event("death", m.group(1), {"raw": message}, timestamp)

    # Advancement
    m = ADVANCEMENT_PAT.match(message)
    if m:
        return normalize_event("advancement", m.group(1), {"advancement": m.group(2)}, timestamp)

    # Chat
    m = CHAT_PAT.match(message)
    if m:
        return normalize_event("chat", m.group(1), {"text": m.group(2)}, timestamp)

    # Commands
    m = COMMAND_PAT.match(message)
    if m:
        return normalize_event("command", m.group(1), {"command": m.group(2)}, timestamp)

    # Fallback generic event
    return normalize_event("other", None, {"raw": message, "source": source}, timestamp)


import os
import re


def _read_lines(path):
    """Yield lines from a plain text or gzipped log file."""
    if path.endswith(".gz"):
        with gzip.open(path, "rt", encoding="utf-8", errors="replace") as f:
            for line in f:
                yield line.strip()
    else:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                yield line.strip()


def _clean_villager_message(raw):
    """Extract job and clean message from villager death log.
    e.g. "Villager['Mason'/279454, ...] died, message: 'Mason was shot by Pillager'"
    becomes "Mason was shot by Pillager"
    """
    job_match = re.search(r"Villager\['(\w+)/", raw)
    job = job_match.group(1) if job_match else None
    msg_match = re.search(r"message: '(.+?)'", raw)
    msg = msg_match.group(1) if msg_match else raw
    # Strip the job name prefix if present (avoid "Mason Mason was shot...")
    if job:
        msg = re.sub(rf"^{re.escape(job)}\s+", "", msg)
        return f"{job} {msg}"
    return msg


def _parse_log_lines(lines, log_date, death_markers, join_re, leave_re, death_re):
    """Parse log lines into events and session counts."""
    events = []
    sessions = {}

    for line in lines:
        # Player join
        m = join_re.search(line)
        if m:
            player = m.group(1)
            events.append({
                "type": "join",
                "player": player,
                "line": line
            })
            sessions.setdefault(player, {"joins": 0, "leaves": 0})
            sessions[player]["joins"] += 1
            continue

        # Player leave
        m = leave_re.search(line)
        if m:
            player = m.group(1)
            events.append({
                "type": "leave",
                "player": player,
                "line": line
            })
            sessions.setdefault(player, {"joins": 0, "leaves": 0})
            sessions[player]["leaves"] += 1
            continue

        # Death — extract timestamp from the log line
        m = death_re.match(line)
        if m:
            time_str, player, rest = m.groups()
            if any(marker in rest for marker in death_markers):
                message = _clean_villager_message(rest) if player == "Villager" else rest
                events.append({
                    "type": "death",
                    "player": player,
                    "message": message,
                    "timestamp": f"{log_date}T{time_str}",
                    "line": line
                })
                continue

    return events, sessions


def collect_logs():
    logs_dir = os.getenv("MC_LOGS_DIR")
    if not logs_dir:
        return {"events": [], "sessions": {}, "log_date": None}

    latest = os.path.join(logs_dir, "latest.log")
    if not os.path.isfile(latest):
        return {"events": [], "sessions": {}, "log_date": None}

    # latest.log has no date in its lines, only [HH:MM:SS]. It contains the
    # current day's events, so its date must come from latest.log's own
    # modification time -- NOT from a rotated filename, which is dated for the
    # day it was rotated out (an earlier day). Using a rotated date here would
    # stamp today's events with yesterday's date.
    log_date = datetime.fromtimestamp(os.path.getmtime(latest)).strftime("%Y-%m-%d")

    events = []
    sessions = {}

    # Regex patterns for common server log events
    join_re = re.compile(r": ([A-Za-z0-9_]+) joined the game")
    leave_re = re.compile(r": ([A-Za-z0-9_]+) left the game")
    death_re = re.compile(r"^\[(\d{2}:\d{2}:\d{2})\].*?: ([A-Za-z0-9_]+) (.+)$")
    death_markers = [
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

    # Parse latest.log
    new_events, new_sessions = _parse_log_lines(
        _read_lines(latest), log_date, death_markers, join_re, leave_re, death_re
    )
    events.extend(new_events)
    for player, counts in new_sessions.items():
        sessions.setdefault(player, {"joins": 0, "leaves": 0})
        sessions[player]["joins"] += counts["joins"]
        sessions[player]["leaves"] += counts["leaves"]

    # Parse rotated log files (newest first, include gzipped)
    rotated_files = sorted(
        (f for f in os.listdir(logs_dir)
         if re.match(r"\d{4}-\d{2}-\d{2}-\d+_?\.log(?:\.gz)?$", f)),
        reverse=True,
    )
    for fname in rotated_files:
        m = re.match(r"(\d{4}-\d{2}-\d{2})", fname)
        file_date = m.group(1) if m else log_date
        new_events, new_sessions = _parse_log_lines(
            _read_lines(os.path.join(logs_dir, fname)),
            file_date, death_markers, join_re, leave_re, death_re,
        )
        events.extend(new_events)
        for player, counts in new_sessions.items():
            sessions.setdefault(player, {"joins": 0, "leaves": 0})
            sessions[player]["joins"] += counts["joins"]
            sessions[player]["leaves"] += counts["leaves"]

    return {
        "events": events,
        "sessions": sessions,
        "log_date": log_date,
    }
