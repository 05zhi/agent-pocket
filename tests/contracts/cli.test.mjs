import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('doctor reports evidence limits without exposing environment secrets', () => {
  const result = spawnSync(process.execPath, ['dist/apps/cli/index.js', 'doctor'], {
    encoding: 'utf8', env: { ...process.env, TELEGRAM_BOT_TOKEN: 'synthetic-secret-marker' }
  });
  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.authentication, 'not checked');
  assert.match(report.support, /not implemented/);
  assert.ok(!result.stdout.includes('synthetic-secret-marker'));
});

test('unsupported run command fails instead of pretending to start a managed session', () => {
  const result = spawnSync(process.execPath, ['dist/apps/cli/index.js', 'run', 'codex'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
});
