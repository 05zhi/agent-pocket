import {test} from 'node:test';import assert from 'node:assert/strict';
import {Store} from '../../dist/packages/storage/store.js';import {CodexBridge} from '../../dist/packages/adapter-codex/bridge.js';
import {TelegramApi,TelegramChannel} from '../../dist/packages/channel-telegram/api.js';import {notifyOnce} from '../../dist/packages/core/notifications.js';
test('Codex request flows through outbox to paired Telegram exactly once in normal operation',async()=>{
 const s=new Store(':memory:');s.pair('42','42');let sent=0;const b=new CodexBridge(s,()=>{},()=>1);
 const r=b.receive({id:1,method:'item/commandExecution/requestApproval',params:{threadId:'t',turnId:'v',itemId:'i',command:'PRIVATE_COMMAND',cwd:'PRIVATE_PATH'}});
 const api=new TelegramApi('123:'+ 'x'.repeat(25),async(url,options)=>{sent++;const body=JSON.parse(options.body);assert.equal(body.chat_id,'42');assert.ok(!options.body.includes('PRIVATE'));return new Response(JSON.stringify({ok:true,result:{message_id:1}}));});
 const channel=new TelegramChannel(api,s);assert.ok(await notifyOnce(s,channel,()=>2));assert.equal(await notifyOnce(s,channel,()=>3),false);assert.equal(sent,1);assert.equal(s.state(r.id),'pending');
 b.respond({...r,actorId:'42',chatId:'42',action:'deny'});b.receive({method:'item/completed',params:{threadId:'t',turnId:'v',item:{id:'i'}}});assert.equal(s.state(r.id),'resolved');s.close();
});
