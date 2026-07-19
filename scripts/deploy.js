#!/usr/bin/env node
/**
 * deploy.js
 *
 * 1. Finds the rotated Minecraft logs (*.log.gz) and latest.log in LOGS_DIR.
 * 2. Runs the Python parser (mc_log_parser.py) to build site/stats.json.
 * 3. Runs render.js to turn stats.json into a self-contained site/index.html
 *    (charts, timeline histogram, responsive table -- Chart.js is inlined,
 *    no CDN needed).
 * 4. Publishes the site/ directory to the gh-pages branch via the `gh-pages` npm package.
 *
 * CONFIG (env vars, all optional). Set these in a .env file in the project
 * root (see .env.example), or as real environment variables:
 *   MC_LOGS_DIR   Path to the server's logs directory. Default: ../logs relative to
 *                 this script (adjust to wherever your Minecraft server writes logs,
 *                 e.g. /home/minecraft/server/logs).
 *   MC_SITE_DIR   Output/publish directory. Default: ./site
 *   GIT_TOKEN     GitHub personal access token (repo scope). If set and MC_REPO
 *                 is not, the publish URL is built automatically as
 *                 https://<GIT_TOKEN>@github.com/<MC_REPO_SLUG>.git
 *   MC_REPO_SLUG  "owner/repo" to combine with GIT_TOKEN. Default:
 *                 ChristopherSnay/minecraft-log-visualizer
 *   MC_REPO       Full git remote URL to publish to (overrides GIT_TOKEN/
 *                 MC_REPO_SLUG). Default: reads from the local git config of
 *                 this project (origin). Set explicitly if running from
 *                 somewhere that isn't a clone of the visualizer repo.
 *   MC_BRANCH     Branch to publish to. Default: gh-pages
 *
 * USAGE
 *   MC_LOGS_DIR=/home/minecraft/server/logs npm run deploy
 *
 * Typically wired up as a cron job on the Minecraft server itself, e.g. every
 * 15 minutes:
 *   (every 15 min) cd /path/to/minecraft-log-visualizer && MC_LOGS_DIR=/home/minecraft/server/logs npm run deploy >> deploy.log 2>&1
 *   See README.md for the exact crontab line.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import ghpages from 'gh-pages';
import { render } from './render.js';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const LOGS_DIR = process.env.MC_LOGS_DIR || path.join(__dirname, '..', 'logs');
const SITE_DIR = process.env.MC_SITE_DIR || path.join(__dirname, '..', 'site');
const REPO_SLUG = process.env.MC_REPO_SLUG || 'ChristopherSnay/minecraft-log-visualizer';
const REPO = process.env.MC_REPO ||
  (process.env.GIT_TOKEN ? `https://${process.env.GIT_TOKEN}@github.com/${REPO_SLUG}.git` : undefined);
// optional; gh-pages falls back to local git origin if REPO is undefined
const BRANCH = process.env.MC_BRANCH || 'gh-pages';

function findLogFiles(dir) {
  if (!fs.existsSync(dir)) {
    throw new Error(`Logs directory not found: ${dir} (set MC_LOGS_DIR)`);
  }
  const entries = fs.readdirSync(dir);
  // Accept both the standard "YYYY-MM-DD-N.log.gz" naming and variants like
  // "YYYY-MM-DD-N_log.gz" that some upload/sync tools produce by mangling dots.
  const rotated = entries
    .filter((f) => /\.gz$/i.test(f))
    .map((f) => path.join(dir, f));
  const latest = entries
    .filter((f) => /^latest\.log$/i.test(f))
    .map((f) => path.join(dir, f));
  return [...rotated, ...latest];
}

function findPythonCommand() {
  const candidates = process.platform === 'win32' ? ['python', 'py', 'python3'] : ['python3', 'python'];
  for (const cmd of candidates) {
    try {
      execFileSync(cmd, ['--version'], { stdio: 'ignore' });
      return cmd;
    } catch {
      // try next candidate
    }
  }
  throw new Error(
    `Could not find a working Python interpreter (tried: ${candidates.join(', ')}). ` +
    `Make sure Python is installed and on your PATH.`
  );
}

function runParser(logFiles, outDir) {
  console.log(`Parsing ${logFiles.length} log file(s)...`);
  const pythonCmd = findPythonCommand();
  const args = [path.join(__dirname, 'mc_log_parser.py'), ...logFiles, '-o', outDir];
  execFileSync(pythonCmd, args, { stdio: 'inherit' });
}

function publish(dir) {
  return new Promise((resolve, reject) => {
    const options = { branch: BRANCH, dotfiles: false };
    if (REPO) options.repo = REPO;
    ghpages.publish(dir, options, (err) => (err ? reject(err) : resolve()));
  });
}

async function main() {
  const logFiles = findLogFiles(LOGS_DIR);
  if (logFiles.length === 0) {
    console.error(`No log files found in ${LOGS_DIR} (expected *.log.gz and/or latest.log)`);
    process.exit(1);
  }

  runParser(logFiles, SITE_DIR);

  console.log('Rendering dashboard...');
  render(path.join(SITE_DIR, 'stats.json'), path.join(SITE_DIR, 'index.html'));

  console.log(`Publishing ${SITE_DIR} to ${BRANCH}...`);
  await publish(SITE_DIR);
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
