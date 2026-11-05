import {randomBytes,createHash} from 'node:crypto';
import {Store} from '../storage/store.js';
import {CodexBridge} from '../adapter-codex/bridge.js';
import type {ApprovalRequest,Decision} from '../core/contract.js';
import type {Answers} from '../core/questions.js';
import {TelegramApi} from './api.js';
type Entry={request:ApprovalRequest;params:any;message:number;chat:string;actor:string;state:string;interactive:boolean};
type Choice={entry:Entry;action:Decision['action'];answers?:Answers};
export class TelegramInbox {
 private entries:Entry[]=[];private choices=new Map<string,Choice>();private seen=new Set<number>();
 accepted=0;lastAction?:Decision['action'];
 constructor(private api:TelegramApi,private store:Store,private bridge:CodexBridge,private now=Date.now,private onAccepted:(action:Decision['action'],answers?:Answers)=>void=()=>{}){}
 async present(request:ApprovalRequest,params:any,signal?:AbortSignal){
  const method=request.kind==='input'?'item/tool/requestUserInput':'item/commandExecution/requestApproval';
  if(createHash('sha256').update(JSON.stringify({method,params})).digest('hex')!==request.payloadHash)throw Error('Display content does not match original request');
  const pair=this.store.pairing();if(!pair||this.store.state(request.id)!=='pending')throw Error('Request unavailable');
  const entry:Entry={request:{...request},params:structuredClone(params),message:0,chat:pair.chat,actor:pair.actor,state:'pending',interactive:true};
  const buttons:any[]=[];
  const add=(text:string,action:Decision['action'],answers?:Answers)=>{const token=randomBytes(18).toString('base64url');this.choices.set(token,{entry,action,answers});buttons.push([{text,callback_data:token}]);};
  let text='Agent Pocket · Codex\n以下是原工具提供的內容：\n'+JSON.stringify(params,null,2);
  if(text.length>3500){entry.interactive=false;text='Agent Pocket：請求內容過長，請回電腦完整查看；此訊息不能核准或回答。';}
  else if(request.kind==='input'){
    const qs=params.questions;
    if(qs.length===1)for(const option of (qs[0].options??[]))add(option.label.slice(0,60),'answer',{[qs[0].id]:[option.label]});
    text+='\n請點選答案；自由文字請「回覆這則訊息」。多題請回覆 JSON：{"題目id":["答案"]}。';
    if(qs.length>1)text+='\n可複製此格式填入答案：\n'+JSON.stringify(Object.fromEntries(qs.map((q:any)=>[q.id,['請填答案']])));
  }else{
    const available=params.availableDecisions;
    if(!available||available.includes('accept'))add('允許一次','allow_once');
    if(!available||available.includes('decline'))add('拒絕','deny');
    if(!available||available.includes('cancel'))add('取消此回合','cancel');
  }
  const result=await this.api.call('sendMessage',{chat_id:pair.chat,text,protect_content:true,reply_markup:{inline_keyboard:buttons}},signal);
  if(!Number.isSafeInteger(result.message_id))throw Error('Missing Telegram message id');
  entry.message=result.message_id;this.entries.push(entry);
 }
 async handle(update:any):Promise<boolean>{
  if(!Number.isSafeInteger(update?.update_id)||this.seen.has(update.update_id))return false;
  this.seen.add(update.update_id);if(this.seen.size>10000)this.seen.delete(this.seen.values().next().value!);
  const callback=update.callback_query,m=callback?.message??update.message,from=callback?.from??m?.from;
  const pair=this.store.pairing();
  const authorized=pair&&m?.chat?.type==='private'&&from?.is_bot===false&&String(from.id)===pair.actor&&String(m.chat.id)===pair.chat;
  let accepted=false;
  if(authorized){
    let choice:Choice|undefined;
    if(callback){choice=this.choices.get(callback.data);if(choice?.entry.message!==m.message_id)choice=undefined;}
    else if(!m.forward_origin&&typeof m.text==='string'&&m.reply_to_message){
      const entry=this.entries.find(e=>e.message===m.reply_to_message.message_id&&e.chat===pair.chat&&e.request.kind==='input');
      if(entry){let answers:Answers|undefined;try{
        const qs=entry.params.questions;
        answers=qs.length===1?{[qs[0].id]:[m.text]}:JSON.parse(m.text);
      }catch{}if(answers)choice={entry,action:'answer',answers};}
    }
    if(choice){const e=choice.entry;
      if(e.interactive&&e.actor===pair.actor&&e.chat===pair.chat&&this.now()<e.request.expiresAt&&this.store.state(e.request.id)==='pending'){
        accepted=this.bridge.respond({...e.request,actorId:pair.actor,chatId:pair.chat,action:choice.action},choice.answers);
        if(accepted){this.accepted++;this.lastAction=choice.action;this.onAccepted(choice.action,choice.answers);}
      }
    }
  }
  if(callback?.id)try{await this.api.call('answerCallbackQuery',{callback_query_id:callback.id,text:accepted?'已收到決定，等待 Codex 確認。':'無法套用：請求已失效、答案不符或未配對。'});}catch{}
  if(!callback&&authorized&&m?.reply_to_message&&!accepted)try{await this.api.call('sendMessage',{chat_id:pair.chat,text:'答案未送出：請確認回覆的是仍有效的問題訊息，並完整填寫所有題目及符合選項。'});}catch{}
  await this.refresh();return accepted;
 }
 async refresh(){
  this.store.expire(this.now());
  for(const entry of this.entries){const state=this.store.state(entry.request.id)??'cancelled';
    if(state===entry.state||state==='pending')continue;
    const label=state==='resolved'?'Codex 已確認交付。':state==='delivering'||state==='decision_received'?'已收到決定，等待 Codex 確認。':state==='outcome_unknown'?'交付結果未知，請回電腦確認。':'請求已失效，請回電腦查看。';
    try{await this.api.call('editMessageText',{chat_id:entry.chat,message_id:entry.message,text:`Agent Pocket · ${label}`,reply_markup:{inline_keyboard:[]}});entry.state=state;}catch{}
  }
  const terminal=new Set(this.entries.filter(e=>!['pending','delivering','decision_received'].includes(e.state)));
  this.entries=this.entries.filter(e=>!terminal.has(e));for(const [token,choice] of this.choices)if(terminal.has(choice.entry))this.choices.delete(token);
 }
}
