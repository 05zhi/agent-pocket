import {test} from 'node:test';
import assert from 'node:assert/strict';
import {notification,deliver,mergeHooks} from '../../scripts/desktop-hook-lib.mjs';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,readFileSync,readdirSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';

test('desktop hooks classify only approvals and explicit question tools, redact content',()=>{
  const base={session_id:'private-session',turn_id:'turn',tool_input:{secret:'private-prompt'}};
  for(const tool_name of ['request_user_input','functions.request_user_input_async']) {
    const n=notification({...base,hook_event_name:'PreToolUse',tool_name});
    assert.equal(n.kind,'question');assert.ok(!JSON.stringify(n).includes('private-'));
  }
  assert.equal(notification({...base,hook_event_name:'PermissionRequest'}).kind,'approval');
  assert.equal(notification({...base,hook_event_name:'PostToolUse',tool_name:'request_user_input'}),undefined);
  assert.equal(notification({...base,hook_event_name:'PreToolUse',tool_name:'fake_request_user_input'}),undefined);
  assert.equal(notification({hook_event_name:'PermissionRequest'}),undefined);
});
test('dedup keys distinguish sessions, turns and tool invocations',()=>{
  const e={session_id:'s',turn_id:'t',tool_use_id:'i',hook_event_name:'PreToolUse',tool_name:'request_user_input'};
  assert.equal(notification(e).key,notification({...e}).key);
  for(const patch of [{session_id:'s2'},{turn_id:'t2'},{tool_use_id:'i2'}])assert.notEqual(notification(e).key,notification({...e,...patch}).key);
  const approval={session_id:'s',turn_id:'t',hook_event_name:'PermissionRequest',tool_input:{command:'echo hello'}};
  assert.notEqual(notification(approval).key,notification(approval).key,'equal commands without invocation IDs must still notify separately');
});
test('delivery retries only transient errors and respects bounded retry-after',async()=>{
  let calls=0;const waits=[];
  assert.deepEqual(await deliver(async()=>{if(++calls<3)throw {code:429,retryAfterMs:20};},{sleep:async ms=>waits.push(ms)}),{status:'sent',attempts:3});
  assert.deepEqual(waits,[20,20]);
  for(const error of [{code:403},{code:429,retryAfterMs:30000}]) {
    assert.deepEqual(await deliver(async()=>{throw error;}),{status:'failed',attempts:1});
  }
});
test('installer merge preserves unrelated hooks and is idempotent, notification only',()=>{
  const input={description:'mine',hooks:{Stop:[{hooks:[{type:'command',command:'other'}]}],PermissionRequest:[{matcher:'Bash',hooks:[]}]}};
  const merged=mergeHooks(input,'node notify');
  assert.deepEqual(mergeHooks(merged,'node notify'),merged);
  assert.deepEqual(merged.hooks.Stop,input.hooks.Stop);
  assert.deepEqual(merged.hooks.PermissionRequest[0],input.hooks.PermissionRequest[0]);
  assert.equal(input.hooks.PermissionRequest.length,1);
  for(const event of ['PermissionRequest','PreToolUse'])assert.equal(merged.hooks[event].at(-1).hooks[0].async,true);
});
test('hook subprocess always emits no decisions for malformed or irrelevant input',()=>{
  for(const input of ['invalid',JSON.stringify({session_id:'s',hook_event_name:'Stop'})]) {
    const result=spawnSync(process.execPath,['scripts/desktop-hook.mjs'],{input,encoding:'utf8'});
    assert.equal(result.status,0);assert.equal(result.stdout,'');
    assert.ok(!result.stderr.includes('invalid'));
  }
});
test('installer preserves existing config on disk, backs up once and reruns idempotently',()=>{
  mkdirSync('.cache',{recursive:true});
  const home=mkdtempSync(join(process.cwd(),'.cache/pocket-hooks-'));
  const original=JSON.stringify({hooks:{Stop:[{hooks:[{type:'command',command:'echo mine'}]}]}});
  writeFileSync(join(home,'hooks.json'),original);
  const run=()=>spawnSync(process.execPath,['scripts/install-desktop-hooks.mjs','--install'],{env:{...process.env,CODEX_HOME:home},encoding:'utf8'});
  const installed=run();assert.equal(installed.status,0,installed.stderr);
  const first=readFileSync(join(home,'hooks.json'),'utf8');
  assert.equal(run().status,0);
  assert.equal(readFileSync(join(home,'hooks.json'),'utf8'),first);
  const backups=readdirSync(home).filter(x=>x.includes('backup'));
  assert.equal(backups.length,1);
  assert.equal(readFileSync(join(home,backups[0]),'utf8'),original);
  const config=JSON.parse(first);
  assert.equal(config.hooks.Stop[0].hooks[0].command,'echo mine');
  assert.ok(config.hooks.PermissionRequest[0].hooks[0].command.startsWith('node '));
});
