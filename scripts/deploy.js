import { execSync } from 'child_process';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';

const DIST = path.resolve('dist');
const BRANCH = 'gh-pages';
const REMOTE = 'origin';

function run(cmd, opts) {
  return (execSync(cmd, { encoding: 'utf-8', stdio: 'pipe', ...opts }) ?? '').trim();
}

function main() {
  if (!fs.existsSync(DIST)) {
    console.error('dist/ not found. Run the build first.');
    process.exit(1);
  }

  const repoUrl = run(`git config --get remote.${REMOTE}.url`);
  const tmpDir = path.join(os.tmpdir(), `gh-pages-deploy-${Date.now()}`);

  try {
    console.log(`Cloning ${BRANCH} into temp dir...`);
    run(
      `git clone ${repoUrl} ${tmpDir} --branch ${BRANCH} --single-branch --origin ${REMOTE} --depth 1`,
      { stdio: 'inherit' }
    );

    console.log('Cleaning old files...');
    run('git rm -rf .', { cwd: tmpDir, stdio: 'inherit' });

    console.log('Copying dist/...');
    fs.copySync(DIST, tmpDir);

    console.log('Committing and pushing...');
    run('git add .', { cwd: tmpDir, stdio: 'inherit' });

    try {
      run('git diff --cached --quiet', { cwd: tmpDir });
      console.log('No changes to deploy.');
      return;
    } catch {
      // diff exited non-zero means there are changes
    }

    run(`git commit -m "Deploy ${new Date().toISOString()}"`, {
      cwd: tmpDir,
      stdio: 'inherit'
    });
    run(`git push ${REMOTE} ${BRANCH}`, { cwd: tmpDir, stdio: 'inherit' });
    console.log('Deploy complete.');
  } finally {
    fs.removeSync(tmpDir);
  }
}

main();
