import {test} from 'node:test';import assert from 'node:assert/strict';
import {PairingChallenge} from '../../dist/packages/channel-telegram/pairing.js';
import {TelegramApi,TelegramChannel} from '../../dist/packages/channel-telegram/api.js';import {Store} from '../../dist/packages/storage/store.js';
const token='123:'+ 'x'.repeat(25);
const message=(code)=>({message:{chat:{id:42,type:'private'},from:{id:42,is_bot:false},text:code}});
test('pairing code is short-lived, one-use and limited to matching private identity',()=>{
 const p=new PairingChallenge(100);assert.equal(p.accept(message('wrong'),0),undefined);
 const group=message(p.code);group.message.chat.type='group';assert.equal(p.accept(group,0),undefined);
 const stranger=message(p.code);stranger.message.from.id=43;assert.equal(p.accept(stranger,0),undefined);
 assert.deepEqual(p.accept(message(p.code),0),{actor:'42',chat:'42'});assert.equal(p.accept(message(p.code),1),undefined);
 const expired=new PairingChallenge(10);assert.equal(expired.accept(message(expired.code),10),undefined);
});
test('API redacts network and Telegram errors; notifications classify retry and omit raw content',async()=>{
 const s=new Store(':memory:');s.pair('42','42');s.startSession('s','g');s.enqueue({id:'r',sessionId:'s',generation:'g',nativeRequestId:'secret',version:1,payloadHash:'a'.repeat(64),expiresAt:Date.now()+10000},Date.now());
 for(const code of [429,500,401]){
 const api=new TelegramApi(token,async(url,init)=>{assert.ok(!init.body.includes('secret'));assert.equal(JSON.parse(init.body).parse_mode,undefined);return new Response(JSON.stringify({ok:false,error_code:code,description:token,parameters:{retry_after:2}}),{status:code});});
 const result=await new TelegramChannel(api,s).send('r',new AbortController().signal);assert.equal(result.status,code===401?'failed':'retry');if(code===429)assert.equal(result.retryAfterMs,2000);
 }
 const bad=new TelegramApi(token,async()=>{throw Error(token);});await assert.rejects(bad.call('getMe'),error=>!error.message.includes(token));
 s.revokePairing();assert.deepEqual(await new TelegramChannel(bad,s).send('r',new AbortController().signal),{status:'failed'});s.close();
});
test('notification goes only to the stored private chat and reports API acceptance',async()=>{
 const s=new Store(':memory:');s.pair('42','42');s.startSession('s','g');s.enqueue({id:'r',sessionId:'s',generation:'g',nativeRequestId:'n',version:1,payloadHash:'a'.repeat(64),expiresAt:Date.now()+10000},Date.now());
 let calls=0;const api=new TelegramApi(token,async(url,init)=>{calls++;const body=JSON.parse(init.body);assert.equal(body.chat_id,'42');assert.equal(body.reply_markup,undefined);assert.equal(init.redirect,'error');return new Response(JSON.stringify({ok:true,result:{message_id:1}}));});
 const channel=new TelegramChannel(api,s);assert.deepEqual(await channel.send('r',new AbortController().signal),{status:'sent'});s.cancelSession('s');assert.deepEqual(await channel.send('r',new AbortController().signal),{status:'failed'});assert.equal(calls,1);s.close();
});
