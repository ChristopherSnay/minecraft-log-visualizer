import gzip
import os
import re
from datetime import datetime, timedelta


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


def _strip_entity_metadata(text):
    """Remove entity metadata brackets like ['Villager'/828484, ...] from death messages."""
    result = []
    depth = 0
    for ch in text:
        if ch == "[":
            depth += 1
        elif ch == "]":
            depth = max(0, depth - 1)
        elif depth == 0:
            result.append(ch)
    text = "".join(result)
    text = re.sub(r"\s+", " ", text).strip().rstrip(".").strip()
    return text


def _clean_villager_message(raw):
    """Extract job and clean message from villager death log.

    Returns (message, entity_type) tuple.
    """
    job_match = re.search(r"Villager\['(\w+)/", raw)
    job = job_match.group(1) if job_match else None
    msg_match = re.search(r"message: '(.+?)'", raw)
    msg = msg_match.group(1) if msg_match else raw
    if job:
        msg = re.sub(rf"^{re.escape(job)}\s+", "", msg)
        return f"{job} {_strip_entity_metadata(msg)}", "Villager"
    return _strip_entity_metadata(msg), "Villager"


def _clean_entity_message(raw):
    """Extract entity name and type from named entity death log.

    Returns (message, entity_type) tuple.
    """
    entity_match = re.search(r"entity (\w+)\['(\w+)'/", raw)
    if not entity_match:
        return _strip_entity_metadata(raw), None
    entity_type = entity_match.group(1)
    msg_match = re.search(r"died:\s*(.+)$", raw)
    msg = msg_match.group(1) if msg_match else raw
    return _strip_entity_metadata(msg), entity_type


def _extract_time(line):
    """Extract HH:MM:SS from the start of a log line."""
    m = re.match(r"^\[(\d{2}:\d{2}:\d{2})", line)
    return m.group(1) if m else None


def _parse_log_file(path, log_date, death_markers, join_re, leave_re, death_re, now=None):
    """Parse a single log file.

    Returns:
        events: list of event dicts (join, leave, death)
        had_stopping_server: bool
        last_timestamp: str or None — timestamp of the last log line
        online_players: dict of player name -> last join timestamp
        server_start_time: str or None — timestamp of first 'Done (' line
        pause_sessions: list of {startTime, endTime}
    """
    events = []
    had_stopping_server = False
    last_timestamp = None
    online_players = {}
    server_start_time = None
    pause_start = None
    pause_sessions = []

    now = now or datetime.now()
    current_date = log_date
    prev_hour = None

    for line in _read_lines(path):
        time_str = _extract_time(line)

        ts = None
        if time_str:
            h = int(time_str[:2])
            m = int(time_str[3:5])
            now_minutes = now.hour * 60 + now.minute
            event_minutes = h * 60 + m

            # First timestamp: if the event time is well ahead of the current
            # time (e.g. we're at 1 PM and the log says 10 PM), the session
            # started on the previous day.
            if prev_hour is None and event_minutes > now_minutes + 180:
                d = datetime.fromisoformat(log_date) - timedelta(days=1)
                current_date = d.strftime("%Y-%m-%d")
            # Midnight rollover: hour jumps from late evening to early morning
            if prev_hour is not None and h < 6 and prev_hour >= 20:
                d = datetime.fromisoformat(current_date) + timedelta(days=1)
                current_date = d.strftime("%Y-%m-%d")
            prev_hour = h
            ts = f"{current_date}T{time_str}"

        if "Stopping server" in line:
            had_stopping_server = True

        if "pausing" in line and pause_start is None and ts:
            pause_start = ts

        # Player join
        m = join_re.search(line)
        if m:
            player = m.group(1)
            event = {"type": "join", "player": player, "line": line}
            if ts:
                event["timestamp"] = ts
            events.append(event)
            if ts:
                online_players[player] = ts

            if pause_start and ts:
                pause_sessions.append({"startTime": pause_start, "endTime": ts})
                pause_start = None
            continue

        # Player leave
        m = leave_re.search(line)
        if m:
            player = m.group(1)
            event = {"type": "leave", "player": player, "line": line}
            if ts:
                event["timestamp"] = ts
            events.append(event)
            online_players.pop(player, None)
            continue

        # Server start
        if server_start_time is None and "Done (" in line and ts:
            server_start_time = ts

        # Death
        m = death_re.match(line)
        if m:
            time_str2, player, rest = m.groups()
            if any(marker in rest for marker in death_markers):
                entity_type = None
                if player == "Villager":
                    message, entity_type = _clean_villager_message(rest)
                elif re.search(r"^entity \w+\['\w+'/", rest):
                    message, entity_type = _clean_entity_message(rest)
                else:
                    message = rest
                event = {
                    "type": "death",
                    "player": player,
                    "message": message,
                    "timestamp": ts,
                    "line": line,
                }
                if entity_type:
                    event["entity_type"] = entity_type
                events.append(event)
                if ts:
                    last_timestamp = ts
                continue

        # Track last timestamp from non-event lines
        if ts:
            last_timestamp = ts

    return events, had_stopping_server, last_timestamp, online_players, server_start_time, pause_sessions


def collect_logs():
    mc_root = os.getenv("MC_ROOT")
    if not mc_root:
        return {
            "events": [],
            "files": [],
            "log_date": None,
        }

    logs_dir = os.path.join(mc_root, "logs")

    latest = os.path.join(logs_dir, "latest.log")
    if not os.path.isfile(latest):
        return {
            "events": [],
            "files": [],
            "log_date": None,
        }

    now = datetime.now()
    log_date = now.strftime("%Y-%m-%d")

    join_re = re.compile(r": ([A-Za-z0-9_]+) joined the game")
    leave_re = re.compile(r": ([A-Za-z0-9_]+) left the game")
    death_re = re.compile(
        r"^\[(\d{2}:\d{2}:\d{2})(?:\s+\w+)?\].*?: ([A-Za-z0-9_]+) (.+)$"
    )
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

    events = []
    files = []

    # Parse latest.log
    result = _parse_log_file(
        latest, log_date, death_markers, join_re, leave_re, death_re, now
    )
    new_events, had_stop, last_ts, online, server_start, pauses = result
    events.extend(new_events)
    files.append({
        "is_latest": True,
        "had_stop": had_stop,
        "last_timestamp": last_ts,
        "online_players": online,
        "server_start_time": server_start,
        "pause_sessions": pauses,
    })

    # Parse rotated log files (oldest first)
    rotated_files = sorted(
        (
            f
            for f in os.listdir(logs_dir)
            if re.match(r"\d{4}-\d{2}-\d{2}-\d+_?\.log(?:\.gz)?$", f)
        ),
    )

    for fname in rotated_files:
        m = re.match(r"(\d{4}-\d{2}-\d{2})", fname)
        file_date = m.group(1) if m else log_date
        result = _parse_log_file(
            os.path.join(logs_dir, fname),
            file_date,
            death_markers,
            join_re,
            leave_re,
            death_re,
            now,
        )
        f_events, had_stop, last_ts, online, server_start, pauses = result
        events.extend(f_events)
        files.append({
            "is_latest": False,
            "had_stop": had_stop,
            "last_timestamp": last_ts,
            "online_players": online,
            "server_start_time": server_start,
            "pause_sessions": pauses,
        })

    return {
        "events": events,
        "files": files,
        "log_date": log_date,
    }
