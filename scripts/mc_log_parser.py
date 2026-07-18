#!/usr/bin/env python3
"""
mc_log_parser.py

Parses vanilla Minecraft Java server logs (rotated .log.gz files + the live
latest.log) into a single JSON stats file and a static, self-contained HTML
dashboard (playtime, deaths, advancements) suitable for publishing on
GitHub Pages.

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
    <outdir>/stats.json  -- structured data, safe to re-parse elsewhere
    <outdir>/index.html  -- static dashboard, embeds the JSON, no server needed
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

# Substrings that identify a death message. Matched against the remainder of
# the line after the leading player name. Not exhaustive of every possible
# datapack/mod death message, but covers vanilla Java Edition.
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


def is_death_message(rest: str) -> bool:
    return any(marker in rest for marker in DEATH_MARKERS)


def open_log(path: Path):
    if path.suffix == ".gz":
        return gzip.open(path, "rt", encoding="utf-8", errors="replace")
    return open(path, "rt", encoding="utf-8", errors="replace")


def file_sort_key(path: Path):
    """Sort rotated logs by date+sequence; unmatched files (latest.log) sort last."""
    m = DATED_FILENAME_RE.search(path.name)
    if m:
        return (0, m.group(1), int(m.group(2)))
    return (1, "", 0)


def infer_date_for_file(path: Path, prev_date: str | None, prev_last_time: str | None,
                         first_event_time: str | None, latest_date_override: str | None):
    m = DATED_FILENAME_RE.search(path.name)
    if m:
        return m.group(1)
    if latest_date_override:
        return latest_date_override
    if prev_date is None:
        # No prior rotated log to anchor to -- fall back to today's date (UTC).
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if prev_last_time and first_event_time and first_event_time < prev_last_time:
        # Looks like a midnight rollover: latest.log's first event is earlier
        # in the clock than the previous log's last event.
        d = datetime.strptime(prev_date, "%Y-%m-%d") + timedelta(days=1)
        return d.strftime("%Y-%m-%d")
    return prev_date


def parse_files(paths: list[Path], latest_date_override: str | None):
    events = []  # list of dicts: {time: datetime, type, player, ...}
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

        # Peek first timestamp in this file to help infer date for undated files.
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
# Aggregation
# ---------------------------------------------------------------------------

def build_stats(events: list[dict]):
    players = defaultdict(lambda: {
        "playtime_seconds": 0,
        "sessions": [],
        "deaths": [],
        "advancements": [],
        "first_seen": None,
        "last_seen": None,
    })
    open_sessions = {}  # player -> join datetime

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
        player, t = e["player"] if "player" in e else None, e["time"]
        if e["type"] == "join":
            touch(e["player"], t)
            # If there's already an open session (e.g. missed a leave/crash),
            # close it out at this join time before starting a new one.
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
            touch(e["player"], t)
            if e["player"] in open_sessions:
                start = open_sessions.pop(e["player"])
                dur = int((t - start).total_seconds())
                players[e["player"]]["sessions"].append({
                    "join": start.isoformat(), "leave": t.isoformat(),
                    "duration_seconds": dur, "ongoing": False,
                })
                players[e["player"]]["playtime_seconds"] += dur
        elif e["type"] == "advancement":
            touch(e["player"], t)
            players[e["player"]]["advancements"].append({
                "time": t.isoformat(), "name": e["name"], "kind": e["kind"],
            })
        elif e["type"] == "death":
            touch(e["player"], t)
            players[e["player"]]["deaths"].append({
                "time": t.isoformat(), "message": e["message"],
            })

    # Close out any sessions still open at the end of the log range.
    for player, start in open_sessions.items():
        dur = int((range_end - start).total_seconds())
        players[player]["sessions"].append({
            "join": start.isoformat(), "leave": None,
            "duration_seconds": dur, "ongoing": True,
        })
        players[player]["playtime_seconds"] += dur

    # Finalize player dicts (convert datetimes to iso strings).
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

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "date_range": {
            "start": range_start.isoformat() if events else None,
            "end": range_end.isoformat() if events else None,
        },
        "players": final_players,
        "totals": totals,
    }


# ---------------------------------------------------------------------------
# HTML rendering
# ---------------------------------------------------------------------------

HTML_TEMPLATE = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Minecraft Server Stats</title>
<style>
  :root {
    --bg: #14171a;
    --panel: #1c2023;
    --panel-alt: #22272b;
    --border: #2e3438;
    --text: #e8eaed;
    --text-dim: #9aa4ad;
    --accent: #6cbf6c;
    --accent-dim: #3f7d3f;
    --red: #d97a7a;
    --gold: #e0b24c;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.5;
  }
  header {
    padding: 2rem 1.5rem 1rem;
    max-width: 1100px;
    margin: 0 auto;
  }
  header h1 { margin: 0 0 0.25rem; font-size: 1.6rem; }
  header p { margin: 0; color: var(--text-dim); font-size: 0.9rem; }
  main { max-width: 1100px; margin: 0 auto; padding: 0 1.5rem 3rem; }

  .totals {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 0.75rem;
    margin: 1.5rem 0 2rem;
  }
  .stat-card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 1rem;
    text-align: center;
  }
  .stat-card .value { font-size: 1.6rem; font-weight: 700; color: var(--accent); }
  .stat-card .label { font-size: 0.78rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.04em; }

  h2 {
    font-size: 1.1rem;
    margin: 2rem 0 0.75rem;
    padding-bottom: 0.4rem;
    border-bottom: 1px solid var(--border);
  }

  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 0.55rem 0.6rem; font-size: 0.9rem; }
  th {
    color: var(--text-dim); font-weight: 600; font-size: 0.78rem;
    text-transform: uppercase; letter-spacing: 0.03em;
    cursor: pointer; user-select: none;
    border-bottom: 1px solid var(--border);
  }
  th:hover { color: var(--text); }
  tbody tr { border-bottom: 1px solid var(--border); }
  tbody tr:hover { background: var(--panel-alt); }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }

  .panel { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 0.5rem 1rem; }

  .feed { max-height: 420px; overflow-y: auto; }
  .feed-item { display: flex; gap: 0.6rem; padding: 0.4rem 0; border-bottom: 1px solid var(--border); font-size: 0.88rem; }
  .feed-item:last-child { border-bottom: none; }
  .feed-time { color: var(--text-dim); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .feed-player { color: var(--accent); font-weight: 600; white-space: nowrap; }
  .feed-death .feed-player { color: var(--red); }
  .feed-adv .feed-player { color: var(--gold); }

  .tabs { display: flex; gap: 0.4rem; margin-bottom: 0.75rem; }
  .tab-btn {
    background: var(--panel); border: 1px solid var(--border); color: var(--text-dim);
    padding: 0.45rem 0.9rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem;
  }
  .tab-btn.active { color: var(--bg); background: var(--accent); border-color: var(--accent); font-weight: 600; }
  .tab-panel { display: none; }
  .tab-panel.active { display: block; }

  footer { text-align: center; color: var(--text-dim); font-size: 0.78rem; padding: 2rem 0 1rem; }
</style>
</head>
<body>
<header>
  <h1>&#x26cf;&#xfe0f; Minecraft Server Stats</h1>
  <p id="range-text"></p>
</header>
<main>
  <div class="totals" id="totals"></div>

  <h2>Leaderboard</h2>
  <div class="panel">
    <table id="leaderboard">
      <thead>
        <tr>
          <th data-key="name">Player</th>
          <th data-key="playtime_seconds" class="num">Playtime</th>
          <th data-key="deaths" class="num">Deaths</th>
          <th data-key="advancements" class="num">Advancements</th>
          <th data-key="last_seen">Last Seen</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  </div>

  <h2>Activity</h2>
  <div class="tabs">
    <button class="tab-btn active" data-tab="deaths">Deaths</button>
    <button class="tab-btn" data-tab="advancements">Advancements</button>
  </div>
  <div class="panel">
    <div class="tab-panel active feed" id="tab-deaths"></div>
    <div class="tab-panel feed" id="tab-advancements"></div>
  </div>

  <footer>Generated <span id="generated-at"></span></footer>
</main>

<script id="stats-data" type="application/json">__DATA_JSON__</script>
<script>
const DATA = JSON.parse(document.getElementById('stats-data').textContent);

function fmtDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
function fmtTime(iso) {
  if (!iso) return '\u2014';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Totals
const totalsEl = document.getElementById('totals');
const t = DATA.totals;
const totalCards = [
  ['Total Playtime', fmtDuration(t.total_playtime_seconds)],
  ['Players', t.unique_players],
  ['Deaths', t.total_deaths],
  ['Advancements', t.total_advancements],
];
totalsEl.innerHTML = totalCards.map(([label, value]) =>
  `<div class="stat-card"><div class="value">${value}</div><div class="label">${label}</div></div>`
).join('');

document.getElementById('range-text').textContent = DATA.date_range.start
  ? `${fmtTime(DATA.date_range.start)} \u2192 ${fmtTime(DATA.date_range.end)}`
  : 'No events found';
document.getElementById('generated-at').textContent = fmtTime(DATA.generated_at);

// Leaderboard
let leaderboardRows = Object.entries(DATA.players).map(([name, p]) => ({
  name,
  playtime_seconds: p.playtime_seconds,
  deaths: p.deaths.length,
  advancements: p.advancements.length,
  last_seen: p.last_seen,
}));

let sortKey = 'playtime_seconds', sortDir = -1;
function renderLeaderboard() {
  leaderboardRows.sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (typeof av === 'string') return sortDir * av.localeCompare(bv);
    return sortDir * (av - bv);
  });
  const tbody = document.querySelector('#leaderboard tbody');
  tbody.innerHTML = leaderboardRows.map(r => `
    <tr>
      <td>${escapeHtml(r.name)}</td>
      <td class="num">${fmtDuration(r.playtime_seconds)}</td>
      <td class="num">${r.deaths}</td>
      <td class="num">${r.advancements}</td>
      <td>${fmtTime(r.last_seen)}</td>
    </tr>`).join('');
}
document.querySelectorAll('#leaderboard th').forEach(th => {
  th.addEventListener('click', () => {
    const key = th.dataset.key;
    sortDir = (sortKey === key) ? -sortDir : -1;
    sortKey = key;
    renderLeaderboard();
  });
});
renderLeaderboard();

// Deaths feed
let deaths = [];
Object.entries(DATA.players).forEach(([name, p]) => {
  p.deaths.forEach(d => deaths.push({ time: d.time, message: d.message }));
});
deaths.sort((a, b) => b.time.localeCompare(a.time));
document.getElementById('tab-deaths').innerHTML = deaths.map(d => `
  <div class="feed-item feed-death">
    <span class="feed-time">${fmtTime(d.time)}</span>
    <span>&#x1f480; ${escapeHtml(d.message)}</span>
  </div>`).join('') || '<p style="color:var(--text-dim)">No deaths recorded.</p>';

// Advancements feed
let advs = [];
Object.entries(DATA.players).forEach(([name, p]) => {
  p.advancements.forEach(a => advs.push({ time: a.time, player: name, name: a.name, kind: a.kind }));
});
advs.sort((a, b) => b.time.localeCompare(a.time));
const kindIcon = { advancement: '\u{1F3C6}', challenge: '\u2b50', goal: '\u{1F3AF}' };
document.getElementById('tab-advancements').innerHTML = advs.map(a => `
  <div class="feed-item feed-adv">
    <span class="feed-time">${fmtTime(a.time)}</span>
    <span class="feed-player">${escapeHtml(a.player)}</span>
    <span>${kindIcon[a.kind] || ''} ${escapeHtml(a.name)}</span>
  </div>`).join('') || '<p style="color:var(--text-dim)">No advancements recorded.</p>';

// Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});
</script>
</body>
</html>
"""


def render_html(stats: dict) -> str:
    return HTML_TEMPLATE.replace("__DATA_JSON__", json.dumps(stats))


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
    (outdir / "index.html").write_text(render_html(stats))

    print(f"Parsed {len(events)} events across {len(paths)} file(s).")
    print(f"Players: {stats['totals']['unique_players']}, "
          f"Deaths: {stats['totals']['total_deaths']}, "
          f"Advancements: {stats['totals']['total_advancements']}")
    print(f"Wrote {outdir / 'stats.json'}")
    print(f"Wrote {outdir / 'index.html'}")


if __name__ == "__main__":
    main()
