import {test} from 'node:test';import assert from 'node:assert/strict';
import {Store} from '../../dist/packages/storage/store.js';import {notifyOnce} from '../../dist/packages/core/notifications.js';
function setup(){const s=new Store(':memory:');s.startSession('s','g');s.enqueue({id:'r',sessionId:'s',generation:'g',nativeRequestId:'n',version:1,payloadHash:'a'.repeat(64),expiresAt:1000000},0);return s;}
test('retry respects rate-limit delay, then succeeds without resending',async()=>{
 const s=setup();let now=0,calls=0;const channel={send:async()=>++calls===1?{status:'retry',retryAfterMs:5000}:{status:'sent'}};
 await notifyOnce(s,channel,()=>now,()=>0);assert.equal(s.notification('r').next_at,5000);
 now=4999;assert.equal(await notifyOnce(s,channel,()=>now),false);now=5000;await notifyOnce(s,channel,()=>now);assert.equal(s.notification('r').status,'sent');assert.equal(await notifyOnce(s,channel,()=>now),false);s.close();
});
test('network failures have a bounded retry count; permanent failures stop immediately',async()=>{
 for(const permanent of [false,true]){const s=setup();let now=0;const channel={send:async()=>{if(permanent)return {status:'failed'};throw Error('synthetic');}};
 for(let i=0;i<5;i++){await notifyOnce(s,channel,()=>now,()=>0);now+=100000;}
 assert.equal(s.notification('r').status,'failed');assert.equal(s.notification('r').attempts,permanent?1:5);s.close();}
});
test('lease fences stale workers and cancellation suppresses new sends',()=>{
 const s=setup();const first=s.claimNotification(0);assert.equal(s.claimNotification(1),undefined);const second=s.claimNotification(30001);
 assert.equal(s.settleNotification('r',first.lease,'sent',0),false);assert.ok(s.settleNotification('r',second.lease,'retry',30001));s.cancelSession('s');assert.equal(s.claimNotification(30002),undefined);s.close();
});
