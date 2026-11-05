import {test} from 'node:test';import assert from 'node:assert/strict';import {Store} from '../../dist/packages/storage/store.js';import {CodexBridge} from '../../dist/packages/adapter-codex/bridge.js';
const wire=(id=1)=>({id,method:'item/commandExecution/requestApproval',params:{threadId:'t',turnId:'v',itemId:'i',command:'synthetic',cwd:'synthetic'}});
test('bridge preserves numeric wire ID, blocks duplicates, and waits for matching completion',()=>{
 const s=new Store(':memory:');s.pair('u','c');const sent=[];const b=new CodexBridge(s,m=>sent.push(m),()=>1);const r=b.receive(wire());const d={...r,actorId:'u',chatId:'c',action:'deny'};
 assert.ok(b.respond(d));assert.equal(b.respond(d),false);assert.deepEqual(sent,[{id:1,result:{decision:'decline'}}]);assert.equal(s.state(r.id),'delivering');
 b.receive({method:'item/completed',params:{threadId:'other',turnId:'v',item:{id:'i'}}});assert.equal(s.state(r.id),'delivering');
 b.receive({method:'item/completed',params:{threadId:'t',turnId:'v',item:{id:'i'}}});assert.equal(s.state(r.id),'resolved');b.disconnect();s.close();
});
test('upstream cancellation, competing resolution and disconnect prevent stale replies',()=>{
 for(const event of [{method:'turn/completed',params:{threadId:'t',turn:{id:'v'}}},{method:'serverRequest/resolved',params:{threadId:'t',requestId:1}},null]){
 const s=new Store(':memory:');s.pair('u','c');let sends=0;const b=new CodexBridge(s,()=>sends++,()=>1);const r=b.receive(wire());event?b.receive(event):b.disconnect();assert.equal(b.respond({...r,actorId:'u',chatId:'c',action:'allow_once'}),false);assert.equal(sends,0);s.close();}
});
test('question answers are validated before state mutation and not logged',()=>{
 const s=new Store(':memory:');s.pair('u','c');const sent=[];const b=new CodexBridge(s,m=>sent.push(m),()=>1);
 const r=b.receive({id:'q',method:'item/tool/requestUserInput',params:{threadId:'t',turnId:'v',itemId:'i',isBlocking:true,questions:[{id:'q1',options:[{label:'BLUE'}]}]}});
 const d={...r,actorId:'u',chatId:'c',action:'answer'};assert.equal(b.respond(d,{q1:['bad']}),false);assert.equal(s.state(r.id),'pending');assert.ok(b.respond(d,{q1:['BLUE']}));assert.deepEqual(sent[0].result,{answers:{q1:{answers:['BLUE']}}});assert.ok(!JSON.stringify(s.audit()).includes('BLUE'));b.disconnect();assert.equal(s.state(r.id),'outcome_unknown');s.close();
});
test('turn completion without matching item evidence preserves unknown delivery',()=>{
 const s=new Store(':memory:');s.pair('u','c');const b=new CodexBridge(s,()=>{},()=>1);const r=b.receive(wire());
 b.respond({...r,actorId:'u',chatId:'c',action:'deny'});b.receive({method:'turn/completed',params:{threadId:'t',turn:{id:'v',status:'completed'}}});assert.equal(s.state(r.id),'outcome_unknown');s.close();
});
