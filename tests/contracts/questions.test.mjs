import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateAnswers} from '../../dist/packages/core/questions.js';
import {Store} from '../../dist/packages/storage/store.js';
test('all questions must be valid; supports single, multiple and free text without guessing',()=>{
 const qs=[{id:'a',options:['A','B'],multiSelect:false,allowText:false},{id:'b',options:['X','Y'],multiSelect:true,allowText:false},{id:'c',options:[],multiSelect:false,allowText:true}];
 const valid={a:['A'],b:['X','Y'],c:['自由回答']};
 assert.deepEqual({...validateAnswers(qs,valid)},valid);
 for(const invalid of [{...valid,a:[]},{...valid,a:['A','B']},{...valid,b:['X','X']},{...valid,b:['Z']},{...valid,c:[' ']},{a:['A']},{...valid,extra:['x']}]) assert.throws(()=>validateAnswers(qs,invalid));
});
test('question identity uses the same single-winner lifecycle; approval cannot answer it',()=>{
 const s=new Store(':memory:'); s.pair('u','c');s.startSession('s','g');
 const r={id:'q',sessionId:'s',generation:'g',nativeRequestId:'n',kind:'input',version:1,payloadHash:'a'.repeat(64),expiresAt:100};s.enqueue(r,0);
 const d={...r,actorId:'u',chatId:'c',action:'answer'};
 assert.equal(s.decide({...d,action:'allow_once'},1),false);assert.ok(s.decide(d,1));assert.equal(s.decide(d,1),false);s.cancelSession('s');assert.equal(s.beginDelivery(d,2),false);s.close();
});
