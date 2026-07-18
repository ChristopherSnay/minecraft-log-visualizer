#!/usr/bin/env node
/**
 * render.js
 *
 * Reads stats.json (produced by mc_log_parser.py) and renders a
 * self-contained, mobile-friendly HTML dashboard: totals, player comparison
 * charts, an activity timeline histogram, a responsive leaderboard table,
 * and deaths/advancements feeds. Chart.js is inlined directly into the page
 * (read from node_modules) so the deployed site has no external dependencies
 * or CDN calls.
 *
 * Can be required as a module (used by deploy.js) or run standalone:
 *   node scripts/render.js site/stats.json site/index.html
 */

const fs = require('fs');
const path = require('path');

function loadChartJsBundle() {
  const candidates = [
    path.join(__dirname, '..', 'node_modules', 'chart.js', 'dist', 'chart.umd.min.js'),
    path.join(__dirname, '..', 'node_modules', 'chart.js', 'dist', 'chart.umd.js'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  }
  throw new Error(
    'Could not find chart.js dist bundle. Run `npm install` in the project root first.'
  );
}

function render(statsJsonPath, outputHtmlPath) {
  const stats = JSON.parse(fs.readFileSync(statsJsonPath, 'utf8'));
  const chartJsBundle = loadChartJsBundle();
  const html = HTML_TEMPLATE
    .replace('/*__CHART_JS_BUNDLE__*/', chartJsBundle)
    .replace('__DATA_JSON__', JSON.stringify(stats));
  fs.writeFileSync(outputHtmlPath, html);
  return stats;
}

// ---------------------------------------------------------------------------
// HTML template
// ---------------------------------------------------------------------------

const HTML_TEMPLATE = `<!DOCTYPE html>
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
    --blue: #6c9bbf;
    --red: #d97a7a;
    --gold: #e0b24c;
  }
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.5;
  }
  header {
    padding: 2rem 1.25rem 1rem;
    max-width: 1200px;
    margin: 0 auto;
  }
  header h1 { margin: 0 0 0.25rem; font-size: 1.5rem; word-break: break-word; }
  header p { margin: 0; color: var(--text-dim); font-size: 0.85rem; }
  main { max-width: 1200px; margin: 0 auto; padding: 0 1.25rem 3rem; overflow-x: hidden; }

  .totals {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 0.6rem;
    margin: 1.5rem 0 2rem;
  }
  .stat-card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.9rem;
    text-align: center;
  }
  .stat-card .value { font-size: 1.4rem; font-weight: 700; color: var(--accent); }
  .stat-card .label { font-size: 0.72rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.04em; }

  h2 {
    font-size: 1.05rem;
    margin: 2rem 0 0.75rem;
    padding-bottom: 0.4rem;
    border-bottom: 1px solid var(--border);
  }

  .panel { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 0.5rem 1rem; }

  /* Player comparison charts */
  .chart-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1rem;
  }
  .chart-card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 1rem;
  }
  .chart-card h3 {
    margin: 0 0 0.75rem;
    font-size: 0.85rem;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.03em;
    font-weight: 600;
  }
  .chart-card .chart-wrap { position: relative; height: 220px; }

  /* Timeline histogram — horizontally scrollable on narrow screens */
  .timeline-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .timeline-inner { position: relative; height: 260px; }

  /* Leaderboard table */
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 0.55rem 0.6rem; font-size: 0.88rem; }
  th {
    color: var(--text-dim); font-weight: 600; font-size: 0.75rem;
    text-transform: uppercase; letter-spacing: 0.03em;
    cursor: pointer; user-select: none;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }
  th:hover { color: var(--text); }
  tbody tr { border-bottom: 1px solid var(--border); }
  tbody tr:hover { background: var(--panel-alt); }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }

  /* Mobile: collapse the table into stacked cards so nothing clips/scrolls sideways */
  @media (max-width: 640px) {
    #leaderboard thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
    #leaderboard, #leaderboard tbody, #leaderboard tr, #leaderboard td { display: block; width: 100%; }
    #leaderboard tr {
      border: 1px solid var(--border);
      border-radius: 10px;
      margin-bottom: 0.6rem;
      padding: 0.3rem 0;
      background: var(--panel-alt);
    }
    #leaderboard td {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: none;
      padding: 0.4rem 0.75rem;
      text-align: right;
    }
    #leaderboard td.name-cell {
      font-weight: 700;
      font-size: 1rem;
      justify-content: flex-start;
      color: var(--accent);
    }
    #leaderboard td::before {
      content: attr(data-label);
      color: var(--text-dim);
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      font-weight: 600;
    }
    #leaderboard td.name-cell::before { content: none; }
  }

  .feed { max-height: 420px; overflow-y: auto; }
  .feed-item { display: flex; gap: 0.6rem; padding: 0.4rem 0; border-bottom: 1px solid var(--border); font-size: 0.86rem; flex-wrap: wrap; }
  .feed-item:last-child { border-bottom: none; }
  .feed-time { color: var(--text-dim); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .feed-player { color: var(--accent); font-weight: 600; white-space: nowrap; }
  .feed-death .feed-player { color: var(--red); }
  .feed-adv .feed-player { color: var(--gold); }

  .tabs { display: flex; gap: 0.4rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
  .tab-btn {
    background: var(--panel); border: 1px solid var(--border); color: var(--text-dim);
    padding: 0.45rem 0.9rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem;
  }
  .tab-btn.active { color: var(--bg); background: var(--accent); border-color: var(--accent); font-weight: 600; }
  .tab-panel { display: none; }
  .tab-panel.active { display: block; }

  footer { text-align: center; color: var(--text-dim); font-size: 0.75rem; padding: 2rem 0 1rem; }

  ::-webkit-scrollbar { height: 8px; width: 8px; }
  ::-webkit-scrollbar-track { background: var(--panel); }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
</style>
</head>
<body>
<header>
  <h1>&#x26cf;&#xfe0f; Minecraft Server Stats</h1>
  <p id="range-text"></p>
</header>
<main>
  <div class="totals" id="totals"></div>

  <h2>Player Comparison</h2>
  <div class="chart-grid">
    <div class="chart-card">
      <h3>Playtime</h3>
      <div class="chart-wrap"><canvas id="chart-playtime"></canvas></div>
    </div>
    <div class="chart-card">
      <h3>Advancements</h3>
      <div class="chart-wrap"><canvas id="chart-advancements"></canvas></div>
    </div>
    <div class="chart-card">
      <h3>Deaths</h3>
      <div class="chart-wrap"><canvas id="chart-deaths"></canvas></div>
    </div>
  </div>

  <h2>Activity Timeline</h2>
  <div class="panel timeline-scroll">
    <div class="timeline-inner" id="timeline-inner">
      <canvas id="chart-timeline"></canvas>
    </div>
  </div>

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

  <h2>Activity Feed</h2>
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

<script>/*__CHART_JS_BUNDLE__*/</script>
<script id="stats-data" type="application/json">__DATA_JSON__</script>
<script>
const DATA = JSON.parse(document.getElementById('stats-data').textContent);

function fmtDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return \`\${h}h \${m}m\`;
  return \`\${m}m\`;
}
function fmtTime(iso) {
  if (!iso) return '\\u2014';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtBucketLabel(iso, isDaily) {
  const d = new Date(iso);
  return isDaily
    ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric' });
}
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

const CHART_COLORS = { accent: '#6cbf6c', blue: '#6c9bbf', red: '#d97a7a', gold: '#e0b24c', dim: '#9aa4ad', grid: '#2e3438' };
Chart.defaults.color = CHART_COLORS.dim;
Chart.defaults.borderColor = CHART_COLORS.grid;
Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

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
  \`<div class="stat-card"><div class="value">\${value}</div><div class="label">\${label}</div></div>\`
).join('');

document.getElementById('range-text').textContent = DATA.date_range.start
  ? \`\${fmtTime(DATA.date_range.start)} \\u2192 \${fmtTime(DATA.date_range.end)}\`
  : 'No events found';
document.getElementById('generated-at').textContent = fmtTime(DATA.generated_at);

// Player comparison charts
const playerNames = Object.keys(DATA.players);
const playtimeData = playerNames.map(n => +(DATA.players[n].playtime_seconds / 3600).toFixed(2));
const advData = playerNames.map(n => DATA.players[n].advancements.length);
const deathData = playerNames.map(n => DATA.players[n].deaths.length);

function horizontalBar(canvasId, labels, data, color, unitLabel) {
  if (labels.length === 0) return;
  new Chart(document.getElementById(canvasId), {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: color, borderRadius: 4, maxBarThickness: 28 }] },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => \`\${ctx.formattedValue} \${unitLabel}\` } },
      },
      scales: {
        x: { beginAtZero: true, grid: { color: CHART_COLORS.grid } },
        y: { grid: { display: false } },
      },
    },
  });
}
horizontalBar('chart-playtime', playerNames, playtimeData, CHART_COLORS.accent, 'hours');
horizontalBar('chart-advancements', playerNames, advData, CHART_COLORS.gold, 'advancements');
horizontalBar('chart-deaths', playerNames, deathData, CHART_COLORS.red, 'deaths');

// Activity timeline histogram
const timeline = DATA.timeline || [];
if (timeline.length > 0) {
  const isDaily = timeline.length >= 2
    && (new Date(timeline[1].bucket_start) - new Date(timeline[0].bucket_start)) >= 86400000;
  const labels = timeline.map(b => fmtBucketLabel(b.bucket_start, isDaily));
  // Widen the scroll area proportional to bucket count so bars stay legible on mobile.
  const minPxPerBucket = 46;
  document.getElementById('timeline-inner').style.minWidth = Math.max(320, timeline.length * minPxPerBucket) + 'px';
  new Chart(document.getElementById('chart-timeline'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Joins', data: timeline.map(b => b.joins), backgroundColor: CHART_COLORS.blue, stack: 's' },
        { label: 'Deaths', data: timeline.map(b => b.deaths), backgroundColor: CHART_COLORS.red, stack: 's' },
        { label: 'Advancements', data: timeline.map(b => b.advancements), backgroundColor: CHART_COLORS.gold, stack: 's' },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { boxWidth: 12, padding: 12 } } },
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, grid: { color: CHART_COLORS.grid } },
      },
    },
  });
} else {
  document.getElementById('timeline-inner').innerHTML = '<p style="color:var(--text-dim)">No events to chart.</p>';
}

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
  tbody.innerHTML = leaderboardRows.map(r => \`
    <tr>
      <td class="name-cell" data-label="Player">\${escapeHtml(r.name)}</td>
      <td class="num" data-label="Playtime">\${fmtDuration(r.playtime_seconds)}</td>
      <td class="num" data-label="Deaths">\${r.deaths}</td>
      <td class="num" data-label="Advancements">\${r.advancements}</td>
      <td data-label="Last Seen">\${fmtTime(r.last_seen)}</td>
    </tr>\`).join('');
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
document.getElementById('tab-deaths').innerHTML = deaths.map(d => \`
  <div class="feed-item feed-death">
    <span class="feed-time">\${fmtTime(d.time)}</span>
    <span>&#x1f480; \${escapeHtml(d.message)}</span>
  </div>\`).join('') || '<p style="color:var(--text-dim)">No deaths recorded.</p>';

// Advancements feed
let advs = [];
Object.entries(DATA.players).forEach(([name, p]) => {
  p.advancements.forEach(a => advs.push({ time: a.time, player: name, name: a.name, kind: a.kind }));
});
advs.sort((a, b) => b.time.localeCompare(a.time));
const kindIcon = { advancement: '\\u{1F3C6}', challenge: '\\u2b50', goal: '\\u{1F3AF}' };
document.getElementById('tab-advancements').innerHTML = advs.map(a => \`
  <div class="feed-item feed-adv">
    <span class="feed-time">\${fmtTime(a.time)}</span>
    <span class="feed-player">\${escapeHtml(a.player)}</span>
    <span>\${kindIcon[a.kind] || ''} \${escapeHtml(a.name)}</span>
  </div>\`).join('') || '<p style="color:var(--text-dim)">No advancements recorded.</p>';

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
`;

module.exports = { render };

if (require.main === module) {
  const [, , statsArg, outArg] = process.argv;
  const statsPath = statsArg || path.join(__dirname, '..', 'site', 'stats.json');
  const outPath = outArg || path.join(__dirname, '..', 'site', 'index.html');
  render(statsPath, outPath);
  console.log(`Wrote ${outPath}`);
}
