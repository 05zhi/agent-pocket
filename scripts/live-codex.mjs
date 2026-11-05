// Explicit opt-in live test. Never run from CI. Only synthetic inputs are used.
import { spawn, spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { Store } from '../dist/packages/storage/store.js';
import { CodexBridge } from '../dist/packages/adapter-codex/bridge.js';

const scenario = process.argv[2];
if (!['approval', 'approval-allow', 'question', 'cancel-approval', 'cancel-question'].includes(scenario)) throw new Error('Unknown scenario');
const cancelling = scenario.startsWith('cancel-');
const question = scenario.endsWith('question');
let interruption;
if (spawnSync('codex', ['--version'], { encoding: 'utf8' }).stdout.trim() !== 'codex-cli 0.166.0-alpha.5.1') throw new Error('Version mismatch');
const cwd = resolve('.cache/live-codex');
mkdirSync(cwd, { recursive: true });
const child = spawn('codex', ['app-server', '--listen', 'stdio://'], { stdio: ['pipe', 'pipe', 'pipe'] });
child.stderr.on('data', () => {}); // Do not persist private diagnostic output.
const pending = new Map();
let sequence = 0;
const evidence = { provider: 'codex', scenario, requestSeen: false, responseSent: false, resumed: false, completed: false, passed: false };
let finish;
const done = new Promise(resolve => { finish = resolve; });
const timeout = setTimeout(() => { finish('timeout'); child.kill(); }, 150000);
const send = value => child.stdin.write(JSON.stringify(value) + '\n');
const store = new Store(':memory:');store.pair('synthetic-user','synthetic-chat');
const bridge = new CodexBridge(store,send);
let boundRequest;
const boundDecision = action => ({...boundRequest,actorId:'synthetic-user',chatId:'synthetic-chat',action});
const rpc = (method, params) => new Promise((resolve, reject) => {
  const id = ++sequence;
  pending.set(id, { resolve, reject });
  send({ id, method, params });
});
child.on('error', () => finish('spawn_failed'));
child.on('exit', () => { for (const p of pending.values()) p.reject(new Error('server exited')); finish('server_exited'); });
createInterface({ input: child.stdout }).on('line', line => {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  try { const request=bridge.receive(msg);if(request)boundRequest=request; }
  catch { finish('bridge_rejected_request');return; }
  if (msg.method && msg.id !== undefined) {
    const p = msg.params;
    if (cancelling && msg.method === (question ? 'item/tool/requestUserInput' : 'item/commandExecution/requestApproval')) {
      evidence.requestSeen = true;
      interruption = rpc('turn/interrupt', { threadId: p.threadId, turnId: p.turnId }).then(() => { evidence.interruptAcknowledged = true; }).catch(() => { evidence.interruptAcknowledged = false; });
      return;
    }
    if (msg.method === 'item/commandExecution/requestApproval') {
      evidence.requestSeen = true;
      const shell = resolve(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/native/powershell/pwsh.exe');
      const expected = `"${shell}" -Command "Write-Output 'AGENT_POCKET_APPROVAL_OK'"`;
      const allow = scenario === 'approval-allow' && (p.command ?? '').replaceAll('\\\\', '\\') === expected;
      evidence.responseSent = bridge.respond(boundDecision(allow?'allow_once':'deny'));
      evidence.duplicateRejected = !bridge.respond(boundDecision(allow?'allow_once':'deny'));
      evidence.decision = allow ? 'accept' : 'decline';
    } else if (msg.method === 'item/tool/requestUserInput' && scenario === 'question') {
      evidence.requestSeen = true;
      const answers = Object.fromEntries(p.questions.map(q => [q.id, [q.options?.find(o=>o.label.includes('POCKET_BLUE'))?.label ?? 'POCKET_BLUE']]));
      evidence.responseSent = bridge.respond(boundDecision('answer'),answers);
      evidence.duplicateRejected = !bridge.respond(boundDecision('answer'),answers);
    } else {
      send({ id: msg.id, error: { code: -32601, message: 'Unsupported by isolated M0 probe' } });
    }
  } else if (msg.id !== undefined && pending.has(msg.id)) {
    const waiter = pending.get(msg.id); pending.delete(msg.id);
    if (msg.error) waiter.reject(new Error(`RPC error ${msg.error.code}`)); else waiter.resolve(msg.result);
  } else if (msg.method === 'item/completed' && evidence.responseSent) {
    const item = msg.params.item;
    if (item.type === 'agentMessage') evidence.resumed = scenario !== 'question' || item.text.includes('POCKET_BLUE');
    if (item.type === 'commandExecution' && item.exitCode === 0 && item.aggregatedOutput?.includes('AGENT_POCKET_APPROVAL_OK')) evidence.commandExecuted = true;
  } else if (msg.method === 'turn/completed') {
    evidence.completed = msg.params.turn.status === 'completed';
    finish(msg.params.turn.status);
  }
});
try {
  await rpc('initialize', { clientInfo: { name: 'agent_pocket_m0', version: '0.0.1' }, capabilities: { experimentalApi: true } });
  send({ method: 'initialized' });
  const started = await rpc('thread/start', { cwd, ephemeral: true, sandbox: 'read-only', approvalPolicy: 'on-request', approvalsReviewer: 'user' });
  const prompt = !question
    ? "This is a protocol test. Request shell execution of exactly Write-Output 'AGENT_POCKET_APPROVAL_OK' with require_escalated and a justification asking for approval. Do not run other commands. If denied, do not retry: say REQUEST_DENIED and finish."
    : 'This is a protocol test. Call request_user_input with a single question choosing POCKET_BLUE or POCKET_GREEN. After receiving the answer, repeat the selected value and finish. Do not call other tools.';
  await rpc('turn/start', { threadId: started.thread.id, input: [{ type: 'text', text: prompt }],
    ...(question ? { collaborationMode: { mode: 'plan', settings: { model: started.model, developer_instructions: null } } } : {}) });
  evidence.outcome = await done;
  if (interruption) await interruption;
  evidence.coreState = boundRequest ? store.state(boundRequest.id) : 'no_request';
  if(cancelling) evidence.staleReplyRejected = !bridge.respond(boundDecision(question?'answer':'allow_once'),{});
  evidence.passed = evidence.requestSeen && evidence.responseSent && evidence.resumed && evidence.completed && (scenario !== 'approval-allow' || (evidence.decision === 'accept' && evidence.commandExecuted === true));
  if (cancelling) evidence.passed = evidence.requestSeen && evidence.interruptAcknowledged === true && evidence.outcome === 'interrupted' && !evidence.responseSent && evidence.staleReplyRejected && evidence.coreState==='cancelled';
  else evidence.passed = evidence.passed && evidence.duplicateRejected;
} catch (error) { evidence.outcome = error.message; }
finally {
  clearTimeout(timeout); child.kill();
  bridge.disconnect();store.close();
  writeFileSync(`.cache/codex-core-${scenario}-evidence.json`, JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence, null, 2));
  process.exitCode = evidence.passed ? 0 : 1;
}
