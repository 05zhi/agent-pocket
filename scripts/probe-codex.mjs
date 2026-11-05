import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const expectedVersion = 'codex-cli 0.166.0-alpha.5.1';
const version = spawnSync('codex', ['--version'], { encoding: 'utf8', timeout: 15000 });
if (version.status !== 0 || version.stdout.trim() !== expectedVersion) {
  throw new Error('Codex version mismatch or unavailable; review compatibility before updating the pin.');
}
mkdirSync('.cache', { recursive: true });
const generated = spawnSync('codex', ['app-server', 'generate-json-schema', '--out', '.cache/codex-schema'], {
  encoding: 'utf8', timeout: 60000
});
if (generated.status !== 0) throw new Error('Schema generation failed');
const raw = readFileSync('.cache/codex-schema/ServerRequest.json');
const schema = JSON.parse(raw);
const methods = schema.oneOf.map(entry => entry.properties.method.enum[0]).sort();
for (const method of ['item/commandExecution/requestApproval', 'item/fileChange/requestApproval', 'item/tool/requestUserInput']) {
  if (!methods.includes(method)) throw new Error(`Required method missing: ${method}`);
}
const report = { version: expectedVersion, sha256: createHash('sha256').update(raw).digest('hex'), methods,
  evidence: 'Generated schema only; no live approval, question, cancellation, or delivery verified.' };
writeFileSync('.cache/codex-probe.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
