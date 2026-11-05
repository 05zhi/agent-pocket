import { spawnSync } from 'node:child_process';

if (process.argv[2] !== 'doctor') {
  console.error('Usage: npm run doctor (development diagnostics only)');
  process.exitCode = 1;
} else {
  const versions = Object.fromEntries(['codex', 'claude'].map(tool => {
    const result = spawnSync(tool, ['--version'], { encoding: 'utf8', timeout: 10000, shell: false });
    return [tool, result.status === 0 ? result.stdout.trim() : 'unavailable'];
  }));
  console.log(JSON.stringify({ node: process.version, platform: process.platform, versions,
    support: 'M0: diagnostics only; remote approvals are not implemented',
    authentication: 'not checked', telegram: 'not configured or tested' }, null, 2));
}
