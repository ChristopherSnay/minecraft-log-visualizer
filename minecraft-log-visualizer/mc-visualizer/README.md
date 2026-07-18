# minecraft-log-visualizer

Parses Minecraft Java server logs (rotated `*.log.gz` + `latest.log`) into a
static stats dashboard (playtime, deaths, advancements, and an activity
timeline) and publishes it to this repo's `gh-pages` branch. No chat content
is ever collected or published.

Live site (once deployed): [`https://christophersnay.github.io/minecraft-log-visualizer/`](https://christophersnay.github.io/minecraft-log-visualizer/)

## How it works

- `scripts/mc_log_parser.py` — parses the logs into `site/stats.json`
  (playtime, deaths, advancements, hourly/daily event timeline).
- `scripts/render.js` — turns `stats.json` into a self-contained
  `site/index.html`: player comparison charts, an activity timeline
  histogram, a sortable/mobile-responsive leaderboard, and deaths/advancements
  feeds. Chart.js is inlined directly into the page (read from
  `node_modules` at build time), so the deployed page makes no external
  requests.
- `scripts/deploy.js` — finds the log files, runs the parser, runs the
  renderer, then uses the `gh-pages` npm package to push `site/` to the
  `gh-pages` branch.

This is meant to run **on the Minecraft server itself** (or anywhere with
access to the log files), since the logs never need to leave the machine —
only the generated static HTML/JSON gets pushed to GitHub.

## Setup

1. Clone this repo onto the machine that has access to the server logs (this
   can be the Minecraft server itself, or wherever you sync/mount the logs to).

   ```bash
   git clone https://github.com/ChristopherSnay/minecraft-log-visualizer.git
   cd minecraft-log-visualizer
   npm install
   ```

2. Make sure Python is available on PATH (`python`, `py`, or `python3` —
   `deploy.js` auto-detects whichever exists). No extra Python packages
   needed, the parser only uses the standard library.

3. Copy `.env.example` to `.env` and fill in:
   - `MC_LOGS_DIR` — path to your server's logs folder (contains
     `*.log.gz` and `latest.log`).
   - `GIT_TOKEN` — a GitHub personal access token (repo scope) so `git`
     can push to this repo. See "Git authentication" below if you haven't
     set this up yet.

4. Run a deploy manually to test:

   ```bash
   npm run deploy
   ```

5. Enable GitHub Pages for this repo: **Settings → Pages → Source: Deploy
   from a branch → Branch: `gh-pages` / `(root)`**. (The `gh-pages` package
   creates the branch on first successful publish, so do step 4 first.)

### Git authentication

`gh-pages` pushes over HTTPS, and GitHub no longer accepts username/password
auth — you need a personal access token:

1. GitHub → profile picture → Settings → Developer settings → Personal
   access tokens → Tokens (classic) → Generate new token (classic). Check
   the `repo` scope, generate, and copy the token immediately (it's only
   shown once).
2. Put it in `.env` as `GIT_TOKEN=ghp_...`. `deploy.js` builds the
   authenticated push URL from this automatically
   (`MC_REPO_SLUG` defaults to `ChristopherSnay/minecraft-log-visualizer` —
   override it if this repo is ever renamed/moved).

## Regenerating just the HTML

If you already have a `site/stats.json` and just want to re-render the
dashboard (e.g. after tweaking `render.js`) without re-parsing logs or
deploying:

```bash
npm run render
```

## Automating it (cron)

Add a cron job on the server to re-deploy periodically, e.g. every 15 minutes
(see the crontab syntax for your system — the line below runs `npm run
deploy` every 15 minutes):

```
*/15 * * * * cd /path/to/minecraft-log-visualizer && npm run deploy >> deploy.log 2>&1
```

## Config (env vars — set in `.env`, see `.env.example`)

| Var            | Default                                    | Purpose                                                    |
| -------------- | ------------------------------------------ | ---------------------------------------------------------- |
| `MC_LOGS_DIR`  | `../logs`                                  | Where to find `*.log.gz` and `latest.log`                  |
| `MC_SITE_DIR`  | `./site`                                   | Where the parser/renderer write output before publishing   |
| `GIT_TOKEN`    | —                                          | GitHub personal access token used to build the push URL    |
| `MC_REPO_SLUG` | `ChristopherSnay/minecraft-log-visualizer` | `owner/repo` combined with `GIT_TOKEN`                     |
| `MC_REPO`      | (local git origin)                         | Full git remote URL — overrides `GIT_TOKEN`/`MC_REPO_SLUG` |
| `MC_BRANCH`    | `gh-pages`                                 | Branch to publish to                                       |

## Privacy notes

- Chat messages are never parsed or published — only joins/leaves, deaths,
  and advancements.
- Player usernames and their join/leave timestamps ARE published (this is
  what makes the leaderboard and timeline possible), so anyone with the
  site URL can see who played when.
- The `gh-pages` branch accumulates commits over time rather than
  squashing, so old snapshots remain in that branch's git history even
  after a newer deploy.

## Notes on date inference

Rotated logs (`YYYY-MM-DD-N.log.gz`) get their date from the filename.
`latest.log` has no date in it, so the parser guesses: if its first
timestamp is earlier than the most recent rotated log's last timestamp, it
assumes a midnight rollover and uses the next day. This is usually correct
when deploys run at least once a day, but if you notice the date is off
(e.g. deploying right after a fresh server start with no prior rotated log
same day), you can hardcode it by editing `deploy.js` to pass
`--latest-date YYYY-MM-DD` through to the parser.
