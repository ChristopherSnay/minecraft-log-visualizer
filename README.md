# minecraft-log-visualizer

Parses Minecraft Java server logs (rotated `*.log.gz` + `latest.log`) into a
static stats dashboard (playtime, chat, deaths, advancements) and publishes
it to this repo's `gh-pages` branch.

Live site (once deployed): `https://christophersnay.github.io/minecraft-log-visualizer/`

## How it works

- `scripts/mc_log_parser.py` — parses the logs into `site/stats.json` + `site/index.html`.
- `scripts/deploy.js` — finds the log files, runs the parser, then uses the
  `gh-pages` npm package to push `site/` to the `gh-pages` branch.

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

2. Make sure `python3` is available (no extra Python packages needed — the
   parser only uses the standard library).

3. Make sure `git` on this machine can push to the repo. Easiest options:
   - SSH: add a deploy key with write access, and use the `git@github.com:...`
     remote form.
   - HTTPS + PAT: set a git credential helper, or embed a token in `MC_REPO`,
     e.g. `MC_REPO=https://<token>@github.com/ChristopherSnay/minecraft-log-visualizer.git`

4. Run a deploy manually to test:

   ```bash
   MC_LOGS_DIR=/path/to/your/server/logs npm run deploy
   ```

   `MC_LOGS_DIR` should point at the folder containing your rotated
   `YYYY-MM-DD-N.log.gz` files and `latest.log` (usually your server's
   `logs/` folder).

5. Enable GitHub Pages for this repo: **Settings → Pages → Source: Deploy
   from a branch → Branch: `gh-pages` / `(root)`**. (The `gh-pages` package
   creates the branch on first successful publish, so do step 4 first.)

## Automating it (cron)

Add a cron job on the server to re-deploy periodically, e.g. every 15 minutes:

```
*/15 * * * * cd /path/to/minecraft-log-visualizer && MC_LOGS_DIR=/home/minecraft/server/logs npm run deploy >> deploy.log 2>&1
```

## Config (env vars)

| Var | Default | Purpose |
|---|---|---|
| `MC_LOGS_DIR` | `../logs` | Where to find `*.log.gz` and `latest.log` |
| `MC_SITE_DIR` | `./site` | Where the parser writes output before publishing |
| `MC_REPO` | (local git origin) | Override the git remote to publish to |
| `MC_BRANCH` | `gh-pages` | Branch to publish to |

## Notes on date inference

Rotated logs (`YYYY-MM-DD-N.log.gz`) get their date from the filename.
`latest.log` has no date in it, so the parser guesses: if its first
timestamp is earlier than the most recent rotated log's last timestamp, it
assumes a midnight rollover and uses the next day. This is usually correct
when deploys run at least once a day, but if you notice the date is off
(e.g. deploying right after a fresh server start with no prior rotated log
same day), you can hardcode it by editing `deploy.js` to pass
`--latest-date YYYY-MM-DD` through to the parser.
