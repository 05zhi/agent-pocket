// Explicit opt-in live test. Never run from CI. Only synthetic inputs are used.
import { spawn, spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdirSync, writeFileSync, openSync, closeSync, unlinkSync, readFileSync } from 'node:fs';
import {createInterface as createPrompt} from 'node:readline/promises';
import {setTimeout as delay} from 'node:timers/promises';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { Store } from '../dist/packages/storage/store.js';
import { CodexBridge } from '../dist/packages/adapter-codex/bridge.js';
import {TelegramApi,TelegramChannel} from '../dist/packages/channel-telegram/api.js';
import {notifyOnce} from '../dist/packages/core/notifications.js';
import {TelegramInbox} from '../dist/packages/channel-telegram/inbox.js';

const scenario = process.argv[2];
if (!['approval', 'approval-allow', 'question', 'cancel-approval', 'cancel-question'].includes(scenario)) throw new Error('Unknown scenario');
const cancelling = scenario.startsWith('cancel-');
const question = scenario.endsWith('question');
const remote=process.argv.includes('--remote');
const phone=process.argv.includes('--telegram')||remote;
if(phone&&!['approval','approval-allow','question'].includes(scenario))throw Error('Unsupported Telegram scenario');
let interruption;
if (spawnSync('codex', ['--version'], { encoding: 'utf8' }).stdout.trim() !== 'codex-cli 0.166.0-alpha.5.1') throw new Error('Version mismatch');
const cwd = resolve('.cache/live-codex');
mkdirSync(cwd, { recursive: true });
let lock,api,prompt;
if(phone){
  try {
    lock=openSync('.cache/telegram.lock','wx');writeFileSync(lock,String(process.pid));
    api=new TelegramApi(process.env.TELEGRAM_BOT_TOKEN??'');
    const bot=await api.call('getMe');
    const saved=JSON.parse(readFileSync('.cache/telegram-cursor.json','utf8'));
    if(bot.id!==saved.botId)throw Error('Bot identity changed');
    if(remote&&(await api.call('getWebhookInfo')).url)throw Error('Dedicated polling bot required');
  } catch {
    if(lock!==undefined){closeSync(lock);unlinkSync('.cache/telegram.lock');}
    console.error('Telegram preflight failed: check pairing, token and local lock.');process.exit(1);
  }
}
const store = new Store(phone?'.cache/telegram.sqlite':':memory:');
if(phone){
  if(!store.pairing()){store.close();closeSync(lock);unlinkSync('.cache/telegram.lock');throw Error('Telegram must be paired first');}
  store.recoverAfterRestart();prompt=createPrompt({input:process.stdin,output:process.stdout});
}else store.pair('synthetic-user','synthetic-chat');
const child = spawn('codex', ['app-server', '--listen', 'stdio://'], { stdio: ['pipe', 'pipe', 'pipe'] });
child.stderr.on('data', () => {}); // Do not persist private diagnostic output.
const pending = new Map();
let sequence = 0;
const evidence = { provider: 'codex', scenario, requestSeen: false, responseSent: false, resumed: false, completed: false, passed: false };
let finish;
const done = new Promise(resolve => { finish = resolve; });
const timeout = setTimeout(() => { finish('timeout'); child.kill(); }, phone?300000:150000);
const send = value => child.stdin.write(JSON.stringify(value) + '\n');
const bridge = new CodexBridge(store,send);
let boundRequest;
const boundDecision = action => ({...boundRequest,actorId:store.pairing()?.actor,chatId:store.pairing()?.chat,action});
let stopped=false;
let remoteTask,inbox;const pollingAbort=new AbortController();
if(remote)inbox=new TelegramInbox(api,store,bridge,Date.now,(action,duplicateBlocked)=>{
 evidence.responseSent=true;evidence.duplicateRejected=duplicateBlocked;evidence.decision=action;
});
async function phoneRequest(request,params){
  if(remote){
    if(!question){
      const shell=resolve(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/native/powershell/pwsh.exe');
      if(params.command.replaceAll('\\\\','\\')!==`"${shell}" -Command "Write-Output 'AGENT_POCKET_APPROVAL_OK'"`)throw Error('Unexpected synthetic command');
    }
    await inbox.present(request,params);evidence.telegramApiAccepted=true;
    console.log('REMOTE_REQUEST_READY: use Telegram buttons or reply to the question message.');
    const file='.cache/telegram-cursor.json';const cursor=JSON.parse(readFileSync(file,'utf8'));
    while(!stopped){
      let updates;
      try{updates=await api.call('getUpdates',{offset:cursor.offset,timeout:10,allowed_updates:['message','callback_query']},pollingAbort.signal);}
      catch{if(stopped)return;await delay(1000);continue;}
      for(const update of updates){
        if(stopped)return;
        if(!Number.isSafeInteger(update.update_id)||update.update_id<cursor.offset)continue;
        await inbox.handle(update);
        cursor.offset=update.update_id+1;writeFileSync(file,JSON.stringify(cursor));
      }
      await inbox.refresh();
    }
    return;
  }
  const channel=new TelegramChannel(api,store);
  const startedAt=Date.now();
  while(!stopped&&store.state(request.id)==='pending'){
    await notifyOnce(store,channel);
    if(stopped)return;
    const delivery=store.notification(request.id);
    if(delivery?.status==='sent'){
      evidence.telegramApiAccepted=true;evidence.eventToApiAcceptedMs=Date.now()-startedAt;
      evidence.notificationAttempts=delivery.attempts;
      console.log('PHONE_NOTIFICATION_ACCEPTED: Codex remains waiting.');
      const response=await prompt.question('After checking your phone, type FINISH to answer the synthetic request locally: ');
      if(stopped)return;
      if(response!=='FINISH'){finish('local_cancel');return;}
      const action=question?'answer':'deny';
      const answers=question?Object.fromEntries(params.questions.map(q=>[q.id,[q.options?.find(o=>o.label.includes('POCKET_BLUE'))?.label??'POCKET_BLUE']])):undefined;
      evidence.responseSent=bridge.respond(boundDecision(action),answers);
      evidence.duplicateRejected=!bridge.respond(boundDecision(action),answers);
      return;
    }
    if(delivery?.status==='failed'){finish('notification_failed');return;}
    await delay(250);
  }
}
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
    if(phone&&boundRequest&&msg.method===(question?'item/tool/requestUserInput':'item/commandExecution/requestApproval')){
      evidence.requestSeen=true;
      if(remoteTask)return;
      remoteTask=phoneRequest(boundRequest,p).catch(()=>finish('phone_flow_failed'));
      return;
    }
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
  evidence.passed = evidence.requestSeen && evidence.responseSent && evidence.resumed && evidence.completed && (scenario !== 'approval-allow' || (['accept','allow_once'].includes(evidence.decision) && evidence.commandExecuted === true));
  if (cancelling) evidence.passed = evidence.requestSeen && evidence.interruptAcknowledged === true && evidence.outcome === 'interrupted' && !evidence.responseSent && evidence.staleReplyRejected && evidence.coreState==='cancelled';
  else evidence.passed = evidence.passed && evidence.duplicateRejected && evidence.coreState==='resolved';
  if(phone)evidence.passed=evidence.passed&&evidence.telegramApiAccepted===true;
} catch (error) { evidence.outcome = error.message; }
finally {
  clearTimeout(timeout); child.kill();
  stopped=true;pollingAbort.abort();prompt?.close();
  if(remoteTask)await remoteTask;
  if(inbox)await inbox.refresh();
  bridge.disconnect();store.close();
  if(lock!==undefined){closeSync(lock);unlinkSync('.cache/telegram.lock');}
  writeFileSync(`.cache/codex-${remote?'remote':phone?'telegram':'core'}-${scenario}-evidence.json`, JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence, null, 2));
  process.exitCode = evidence.passed ? 0 : 1;
}
