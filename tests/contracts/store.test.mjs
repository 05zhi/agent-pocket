import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../../dist/packages/storage/store.js';
const request = (id='r',sessionId='s') => ({ id,sessionId,generation:'g',nativeRequestId:id,version:1,payloadHash:'a'.repeat(64),expiresAt:100 });
const decision = (r=request()) => ({...r,actorId:'user',chatId:'private',action:'allow_once'});
function setup() { const s = new Store(':memory:'); s.pair('user','private'); s.startSession('s','g'); s.enqueue(request(),0); return s; }
test('identity, version, payload, generation, action and expiration are enforced', () => {
  const s=setup();
  for(const change of [{actorId:'attacker'},{chatId:'group'},{version:2},{payloadHash:'b'.repeat(64)},{generation:'old'},{sessionId:'other'},{action:'always_allow'}]) assert.equal(s.decide({...decision(),...change},1),false);
  assert.equal(s.decide(decision(),100),false); assert.equal(s.state('r'),'expired'); s.close();
});
test('cancel and pairing revocation block previously received decisions',()=>{
  for(const operation of ['cancel','revoke']) {
    const s=setup(); assert.ok(s.decide(decision(),1));
    operation==='cancel' ? s.cancelSession('s') : s.revokePairing();
    assert.equal(s.beginDelivery(decision(),2),false); assert.equal(s.decide(decision(),2),false); s.close();
  }
});
test('ten sessions and one hundred requests do not cross route or accept duplicates',()=>{
  const s=new Store(':memory:'); s.pair('user','private');
  for(let i=0;i<10;i++) s.startSession(`s${i}`,'g');
  for(let i=0;i<100;i++) {
    const r=request(`r${i}`,`s${i%10}`); assert.ok(s.enqueue(r,0)); assert.equal(s.enqueue(r,0),false);
    assert.equal(s.decide({...decision(r),sessionId:`s${(i+1)%10}`},1),false);
    assert.ok(s.decide(decision(r),1)); assert.equal(s.decide(decision(r),1),false);
  }
  s.close();
});
test('SQLite competing connections yield one winner; restart invalidates live callbacks',()=>{
  const dir=mkdtempSync(join(tmpdir(),'pocket-test-')); const file=join(dir,'state.sqlite');
  const a=new Store(file), b=new Store(file);
  try {
    a.pair('user','private'); a.startSession('s','g'); a.enqueue(request(),0);
    assert.ok(a.decide(decision(),1)); assert.equal(b.decide(decision(),1),false);
    assert.ok(a.beginDelivery(decision(),2)); assert.equal(b.beginDelivery(decision(),2),false);
    b.recoverAfterRestart(); assert.equal(a.state('r'),'outcome_unknown');
    assert.equal(a.finishDelivery('r',true),false); assert.equal(a.beginDelivery(decision(),3),false);
  } finally { a.close(); b.close(); rmSync(dir,{recursive:true}); }
});
test('outbox persists atomically and hides cancelled requests; conflicts do not enqueue',()=>{
  const s=setup(); assert.deepEqual(s.pendingNotifications(0),['r']);
  assert.throws(()=>s.enqueue({...request(),payloadHash:'b'.repeat(64)},0));
  assert.deepEqual(s.pendingNotifications(0),['r']); s.cancelSession('s'); assert.deepEqual(s.pendingNotifications(0),[]); s.close();
});
test('only original tool acknowledgement resolves delivery',()=>{
  const s=setup(); assert.equal(s.finishDelivery('r',true),false); s.decide(decision(),1); s.beginDelivery(decision(),2);
  assert.equal(s.state('r'),'delivering'); s.finishDelivery('r',false); assert.equal(s.state('r'),'outcome_unknown'); s.close();
});
