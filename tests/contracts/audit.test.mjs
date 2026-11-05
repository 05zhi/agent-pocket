import {test} from 'node:test';import assert from 'node:assert/strict';import {Store} from '../../dist/packages/storage/store.js';
test('transactional audit contains lifecycle metadata without actor or answer payload',()=>{
 const s=new Store(':memory:');s.pair('SECRET_ACTOR','SECRET_CHAT');s.startSession('s','g');
 const r={id:'r',sessionId:'s',generation:'g',nativeRequestId:'SECRET_NATIVE',version:1,payloadHash:'a'.repeat(64),expiresAt:100};s.enqueue(r,0);
 const d={...r,actorId:'SECRET_ACTOR',chatId:'SECRET_CHAT',action:'deny'};s.decide(d,1);s.beginDelivery(d,2);s.finishDelivery('r',true);s.revokePairing();
 assert.deepEqual(s.audit().map(x=>x.event),['pairing_set','request_created','request_decision_received','request_delivering','request_resolved','pairing_revoked']);
 assert.ok(!JSON.stringify(s.audit()).includes('SECRET'));assert.ok(s.pruneAudit(Date.now()+31*86400000)>0);assert.equal(s.audit().length,0);s.close();
});
test('successful final notification attempt remains sent during later polling',()=>{
 const s=new Store(':memory:');s.startSession('s','g');s.enqueue({id:'r',sessionId:'s',generation:'g',nativeRequestId:'n',version:1,payloadHash:'a'.repeat(64),expiresAt:1000000},0);
 for(let i=0;i<5;i++){const j=s.claimNotification(i);s.settleNotification(j.id,j.lease,i===4?'sent':'retry',i);}
 assert.equal(s.claimNotification(10),undefined);assert.equal(s.notification('r').status,'sent');s.close();
});
