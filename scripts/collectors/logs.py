import gzip
import os
import re
from datetime import datetime


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
    """Extract job and clean message from villager death log."""
    job_match = re.search(r"Villager\['(\w+)/", raw)
    job = job_match.group(1) if job_match else None
    msg_match = re.search(r"message: '(.+?)'", raw)
    msg = msg_match.group(1) if msg_match else raw
    if job:
        msg = re.sub(rf"^{re.escape(job)}\s+", "", msg)
        return f"{job} {msg}"
    return msg


def _extract_time(line):
    """Extract HH:MM:SS from the start of a log line."""
    m = re.match(r"^\[(\d{2}:\d{2}:\d{2})", line)
    return m.group(1) if m else None


def _parse_log_file(path, log_date, death_markers, join_re, leave_re, death_re):
    """Parse a single log file and return events, sessions, and shutdown info.

    Returns:
        events: list of event dicts
        sessions: dict of player -> {joins, leaves}
        had_stopping_server: bool — whether the log contained 'Stopping server'
        last_timestamp: str or None — timestamp of the last log line
    """
    events = []
    sessions = {}
    had_stopping_server = False
    last_timestamp = None
    online_players = {}  # player -> last join timestamp

    for line in _read_lines(path):
        # Track server shutdown
        if "Stopping server" in line:
            had_stopping_server = True

        # Player join
        m = join_re.search(line)
        if m:
            player = m.group(1)
            time_str = _extract_time(line)
            ts = f"{log_date}T{time_str}" if time_str else None

            # If the player is already tracked as online, their previous
            # session ended without a leave (e.g. crash disconnect).
            # Close it first so joins and leaves stay balanced.
            if player in online_players and ts:
                synth_event = {
                    "type": "leave",
                    "player": player,
                    "timestamp": ts,
                    "synthetic": True,
                    "reason": "reconnect",
                }
                events.append(synth_event)
                sessions.setdefault(player, {"joins": 0, "leaves": 0})
                sessions[player]["leaves"] += 1

            event = {"type": "join", "player": player, "line": line}
            if ts:
                event["timestamp"] = ts
            events.append(event)
            sessions.setdefault(player, {"joins": 0, "leaves": 0})
            sessions[player]["joins"] += 1
            if ts:
                online_players[player] = ts
            continue

        # Player leave
        m = leave_re.search(line)
        if m:
            player = m.group(1)
            time_str = _extract_time(line)
            ts = f"{log_date}T{time_str}" if time_str else None
            event = {"type": "leave", "player": player, "line": line}
            if ts:
                event["timestamp"] = ts
            events.append(event)
            sessions.setdefault(player, {"joins": 0, "leaves": 0})
            sessions[player]["leaves"] += 1
            online_players.pop(player, None)
            continue

        # Death
        m = death_re.match(line)
        if m:
            time_str, player, rest = m.groups()
            if any(marker in rest for marker in death_markers):
                message = _clean_villager_message(rest) if player == "Villager" else rest
                ts = f"{log_date}T{time_str}"
                events.append({
                    "type": "death",
                    "player": player,
                    "message": message,
                    "timestamp": ts,
                    "line": line,
                })
                last_timestamp = ts
                continue

        # Track last timestamp from any line with a time
        time_str = _extract_time(line)
        if time_str:
            last_timestamp = f"{log_date}T{time_str}"

    return events, sessions, had_stopping_server, last_timestamp, online_players


def collect_logs():
    mc_root = os.getenv("MC_ROOT")
    if not mc_root:
        return {
            "events": [],
            "sessions": {},
            "log_date": None,
            "crashes": [],
            "server_sessions": [],
        }

    logs_dir = os.path.join(mc_root, "logs")

    latest = os.path.join(logs_dir, "latest.log")
    if not os.path.isfile(latest):
        return {
            "events": [],
            "sessions": {},
            "log_date": None,
            "crashes": [],
            "server_sessions": [],
        }

    log_date = datetime.fromtimestamp(os.path.getmtime(latest)).strftime("%Y-%m-%d")

    # Regex patterns
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
    sessions = {}
    crashes = []
    server_sessions = []

    # Parse latest.log
    new_events, new_sessions, had_stop, last_ts, online = _parse_log_file(
        latest, log_date, death_markers, join_re, leave_re, death_re
    )
    events.extend(new_events)
    for player, counts in new_sessions.items():
        sessions.setdefault(player, {"joins": 0, "leaves": 0})
        sessions[player]["joins"] += counts["joins"]
        sessions[player]["leaves"] += counts["leaves"]

    # latest.log without 'Stopping server' means the server is still running
    # or was killed. If players are still online, we don't generate synthetic
    # leaves — they're genuinely still playing.
    latest_crash = None
    if not had_stop and online:
        # Server may have been killed — but since latest.log is the current
        # session, players are likely still connected. Only flag as crash
        # if there's a previous log that also ended without stop (see below).
        pass

    # Parse rotated log files (oldest first so we can build server sessions)
    rotated_files = sorted(
        (
            f
            for f in os.listdir(logs_dir)
            if re.match(r"\d{4}-\d{2}-\d{2}-\d+_?\.log(?:\.gz)?$", f)
        ),
        reverse=False,  # oldest first
    )

    # Collect parsed results for rotated files in order
    rotated_results = []
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
        )
        rotated_results.append((fname, file_date, result))

    # Process rotated files and detect crashes
    for i, (fname, file_date, (f_events, f_sessions, had_stop, last_ts, online)) in enumerate(
        rotated_results
    ):
        events.extend(f_events)
        for player, counts in f_sessions.items():
            sessions.setdefault(player, {"joins": 0, "leaves": 0})
            sessions[player]["joins"] += counts["joins"]
            sessions[player]["leaves"] += counts["leaves"]

        # Detect crash: log ended without 'Stopping server' and players were
        # still online. Generate synthetic leave events at the last timestamp.
        if not had_stop and online and last_ts:
            crash_time = last_ts
            crashes.append({"type": "crash", "timestamp": crash_time})

            # Find the next server start (the next rotated file or latest.log)
            restart_time = None
            if i + 1 < len(rotated_results):
                # Next rotated file — find its first 'Done' line
                next_fname = rotated_results[i + 1][0]
                for line in _read_lines(os.path.join(logs_dir, next_fname)):
                    if "Done (" in line:
                        time_str = _extract_time(line)
                        if time_str:
                            restart_time = f"{rotated_results[i + 1][1]}T{time_str}"
                        break
            else:
                # This is the last rotated file — look in latest.log
                for line in _read_lines(latest):
                    if "Done (" in line:
                        time_str = _extract_time(line)
                        if time_str:
                            restart_time = f"{log_date}T{time_str}"
                        break

            if restart_time:
                server_sessions.append({
                    "startTime": crash_time,
                    "endTime": restart_time,
                })

            # Generate synthetic leave events for online players
            for player in online:
                event = {
                    "type": "leave",
                    "player": player,
                    "timestamp": crash_time,
                    "synthetic": True,
                    "reason": "server_crash",
                }
                events.append(event)
                sessions.setdefault(player, {"joins": 0, "leaves": 0})
                sessions[player]["leaves"] += 1

        # Detect graceful stop followed by restart → server session
        if had_stop and last_ts:
            restart_time = None
            if i + 1 < len(rotated_results):
                next_fname = rotated_results[i + 1][0]
                for line in _read_lines(os.path.join(logs_dir, next_fname)):
                    if "Done (" in line:
                        time_str = _extract_time(line)
                        if time_str:
                            restart_time = f"{rotated_results[i + 1][1]}T{time_str}"
                        break
            else:
                for line in _read_lines(latest):
                    if "Done (" in line:
                        time_str = _extract_time(line)
                        if time_str:
                            restart_time = f"{log_date}T{time_str}"
                        break

            if restart_time:
                server_sessions.append({
                    "startTime": last_ts,
                    "endTime": restart_time,
                })

    return {
        "events": events,
        "sessions": sessions,
        "log_date": log_date,
        "crashes": crashes,
        "server_sessions": server_sessions,
    }
