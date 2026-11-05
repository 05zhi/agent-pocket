import { spawnSync } from 'node:child_process';
import { simulate } from '../../packages/core/simulator.js';

if (process.argv[2] === 'simulate') {
  console.log(JSON.stringify(simulate(),null,2));
} else if (process.argv[2] !== 'doctor') {
  console.error('Usage: agent-pocket doctor | simulate (development tools only)');
  process.exitCode = 1;
} else {
  const versions = Object.fromEntries(['codex'].map(tool => {
    const result = spawnSync(tool, ['--version'], { encoding: 'utf8', timeout: 10000, shell: false });
    return [tool, result.status === 0 ? result.stdout.trim() : 'unavailable'];
  }));
  console.log(JSON.stringify({ node: process.version, platform: process.platform, versions,
    support: 'M1: core and Codex bridge available; phone approvals are not implemented',
    authentication: 'not checked', telegram: 'not configured or tested' }, null, 2));
}
