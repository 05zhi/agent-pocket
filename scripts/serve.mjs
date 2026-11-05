import {mkdirSync,openSync,closeSync,unlinkSync,readFileSync,writeFileSync,renameSync,realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createInterface} from 'node:readline';
import {setTimeout as delay} from 'node:timers/promises';
import {CodexStdio} from '../dist/packages/adapter-codex/stdio.js';
import {CodexBridge} from '../dist/packages/adapter-codex/bridge.js';
import {Store} from '../dist/packages/storage/store.js';
import {TelegramApi,TelegramError} from '../dist/packages/channel-telegram/api.js';
import {TelegramInbox} from '../dist/packages/channel-telegram/inbox.js';
import {notifyOnce} from '../dist/packages/core/notifications.js';
// Foreground managed service. It stays alive between tasks; no automatic OS startup.
const args=process.argv.slice(2);const index=args.indexOf('--project');
if(index<0||!args[index+1])throw Error('Usage: serve.mjs --project <directory> [--prompt-file <file>] [--plan]');
const project=realpathSync(resolve(args[index+1]));
if(spawnSync('codex',['--version'],{encoding:'utf8'}).stdout.trim()!=='codex-cli 0.166.0-alpha.5.1')throw Error('Unsupported Codex version');
mkdirSync('.cache',{recursive:true});
let lock,store,transport,bridge,inbox,lines,thread,model,activeTurn;let busy=false,stopping=false;
const abort=new AbortController();const payloads=new Map();const jobs=[];
const evidence={turns:0,completed:0,interrupted:0,requests:0,answers:0,maxQuestionCount:0,freeTextOffered:false};
let resolveStop;const stopped=new Promise(r=>resolveStop=r);
function stop(){if(stopping)return;stopping=true;abort.abort();resolveStop();}
async function interrupt(){if(thread&&activeTurn)await transport.rpc('turn/interrupt',{threadId:thread,turnId:activeTurn}).catch(()=>{});}
async function start(text,plan=false){
 if(busy){console.log('BUSY: wait for the current turn or use /interrupt.');return;}
 if(!text.trim())return;busy=true;
 try{const turn=await transport.rpc('turn/start',{threadId:thread,input:[{type:'text',text}],...(plan?{collaborationMode:{mode:'plan',settings:{model,developer_instructions:null}}}:{})});activeTurn=turn.turn.id;}
 catch{busy=false;console.error('Turn could not be started.');}
}
try{
 lock=openSync('.cache/telegram.lock','wx');writeFileSync(lock,String(process.pid));
 const api=new TelegramApi(process.env.TELEGRAM_BOT_TOKEN??'');const me=await api.call('getMe');
 const cursorFile='.cache/telegram-cursor.json';const cursor=JSON.parse(readFileSync(cursorFile,'utf8'));
 if(cursor.botId!==me.id||(await api.call('getWebhookInfo')).url)throw Error('Bot identity or polling configuration mismatch');
 store=new Store('.cache/telegram.sqlite');if(!store.pairing())throw Error('Pair Telegram first');store.recoverAfterRestart();store.pruneAudit();
 transport=new CodexStdio();bridge=new CodexBridge(store,m=>transport.send(m));
 inbox=new TelegramInbox(api,store,bridge,Date.now,()=>{evidence.answers++;console.log('PHONE_DECISION_RECEIVED');});
 transport.on('disconnect',()=>{bridge.disconnect();stop();});
 transport.on('message',m=>{
  try{
   const request=bridge.receive(m);
   if(request){payloads.set(request.id,{request,params:structuredClone(m.params)});evidence.requests++;if(m.params.questions){evidence.maxQuestionCount=Math.max(evidence.maxQuestionCount,m.params.questions.length);evidence.freeTextOffered ||= m.params.questions.some(q=>q.isOther||!q.options?.length);}console.log('WAITING_FOR_PHONE');}
   else if(m.method&&m.id!==undefined){transport.send({id:m.id,error:{code:-32601,message:'Unsupported request; return to local tool'}});console.error('Unsupported request: turn will be interrupted.');void interrupt();}
   if(m.method==='turn/started')activeTurn=m.params.turn.id;
   if(m.method==='item/agentMessage/delta')process.stdout.write(m.params.delta);
   if(m.method==='turn/completed'){
    evidence.turns++;if(m.params.turn.status==='completed')evidence.completed++;if(m.params.turn.status==='interrupted')evidence.interrupted++;
    console.log(`\nTURN_${m.params.turn.status.toUpperCase()}; READY_FOR_TASK`);busy=false;activeTurn=undefined;
    for(const [id] of payloads)if(!['pending','delivering','decision_received'].includes(store.state(id)))payloads.delete(id);
   }
  }catch{console.error('Protocol request rejected; interrupting turn.');void interrupt();}
 });
 await transport.rpc('initialize',{clientInfo:{name:'agent_pocket_service',version:'0.0.1'},capabilities:{experimentalApi:true}});transport.send({method:'initialized'});
 const started=await transport.rpc('thread/start',{cwd:project,ephemeral:true,sandbox:'workspace-write',approvalPolicy:'on-request',approvalsReviewer:'user'});thread=started.thread.id;model=started.model;
 const channel={send:async(id,signal)=>{
  const data=payloads.get(id);if(!data)return {status:'failed'};
  try{await inbox.present(data.request,data.params,signal);return {status:'sent'};}catch(e){return e instanceof TelegramError&&(e.code===0||e.code===429||e.code>=500)?{status:'retry',retryAfterMs:e.retryAfterMs}:{status:'failed'};}
 }};
 jobs.push((async()=>{while(!stopping){await notifyOnce(store,channel);await inbox.refresh();await delay(250);}})().catch(()=>stop()));
 jobs.push((async()=>{while(!stopping){try{
  const updates=await api.call('getUpdates',{offset:cursor.offset,timeout:10,allowed_updates:['message','callback_query']},abort.signal);
  for(const u of updates){if(stopping)break;if(!Number.isSafeInteger(u.update_id)||u.update_id<cursor.offset)continue;await inbox.handle(u);cursor.offset=u.update_id+1;writeFileSync(cursorFile+'.tmp',JSON.stringify(cursor));renameSync(cursorFile+'.tmp',cursorFile);}
 }catch{if(!stopping)await delay(1000);}}})());
 lines=createInterface({input:process.stdin});lines.on('line',line=>{if(line==='/quit')stop();else if(line==='/interrupt')void interrupt();else if(line==='/status')console.log(JSON.stringify({busy,...evidence}));else void start(line.startsWith('/plan ')?line.slice(6):line,line.startsWith('/plan '));});
 lines.on('close',()=>stop());process.once('SIGINT',stop);process.once('SIGTERM',stop);
 console.log('SERVICE_READY: type a task, /plan <task>, /status, /interrupt or /quit.');
 const pi=args.indexOf('--prompt-file');if(pi>=0&&args[pi+1])await start(readFileSync(args[pi+1],'utf8'),args.includes('--plan'));
 await stopped;
}catch{console.error('Service startup/runtime failed. Check pairing, token, version and local lock.');process.exitCode=1;}
finally{
 stop();await interrupt();transport?.stop();await Promise.allSettled(jobs);bridge?.disconnect();if(inbox)await inbox.refresh();lines?.close();
 if(store){writeFileSync('.cache/service-evidence.json',JSON.stringify(evidence,null,2));store.close();}
 if(lock!==undefined){closeSync(lock);unlinkSync('.cache/telegram.lock');}
}
