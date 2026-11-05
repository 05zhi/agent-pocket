import {test} from 'node:test';import assert from 'node:assert/strict';import {Store} from '../../dist/packages/storage/store.js';import {CodexBridge} from '../../dist/packages/adapter-codex/bridge.js';
test('blocking answer requires matched resolution followed by same-turn generation; cleanup is not success',()=>{
 for(const mode of ['resume','interrupt','other-turn','no-resolution']) {
 const s=new Store(':memory:');s.pair('u','c');const b=new CodexBridge(s,()=>{},()=>1);
 const r=b.receive({id:1,method:'item/tool/requestUserInput',params:{threadId:'t',turnId:'v',itemId:'i',isBlocking:true,questions:[{id:'q',options:[{label:'A'}]}]}});
 b.respond({...r,actorId:'u',chatId:'c',action:'answer'},{q:['A']});
 if(mode!=='no-resolution')b.receive({method:'serverRequest/resolved',params:{threadId:'t',requestId:1}});
 assert.equal(s.state(r.id),'delivering');
 if(mode==='interrupt') b.receive({method:'turn/completed',params:{threadId:'t',turn:{id:'v',status:'interrupted'}}});
 b.receive({method:'item/started',params:{threadId:'t',turnId:mode==='other-turn'?'other':'v',item:{type:'agentMessage',id:'message'}}});
 assert.equal(s.state(r.id),mode==='resume'?'resolved':mode==='interrupt'?'outcome_unknown':'delivering');b.disconnect();s.close();
 }
});
