import {createHash,randomUUID} from 'node:crypto';
import {Store} from '../storage/store.js';
import type {ApprovalRequest,Decision} from '../core/contract.js';
import {validateAnswers,type Answers,type Question} from '../core/questions.js';
type Wire = {id?:string|number;method?:string;params?:any};
type Live = {request:ApprovalRequest;wireId:string|number;thread:string;turn:string;item:string;questions?:Question[]};
// Transport is the pinned app-server stdio connection, never a public HTTP endpoint.
export class CodexBridge {
  readonly capabilities={version:'0.166.0-alpha.5.1',supportsApproval:true,supportsQuestions:true,supportsCancel:true,supportsReconcile:false};
  private live=new Map<string,Live>(); private sessions=new Map<string,string>();
  private generation=randomUUID();
  constructor(private store:Store,private send:(response:object)=>void,private now=Date.now) {}
  receive(message:Wire):ApprovalRequest|undefined {
    const p=message.params;
    if(message.id!==undefined && message.method) {
      if(!['item/commandExecution/requestApproval','item/tool/requestUserInput'].includes(message.method)) return;
      if(!p || !['threadId','turnId','itemId'].every(k=>typeof p[k]==='string' && p[k])) throw Error('Invalid request correlation');
      const key=JSON.stringify(message.id);const previous=this.live.get(key);
      const hash=createHash('sha256').update(JSON.stringify({method:message.method,params:p})).digest('hex');
      if(previous) {if(previous.request.payloadHash!==hash)throw Error('Conflicting native request');return {...previous.request};}
      const input=message.method==='item/tool/requestUserInput'; let questions:Question[]|undefined;
      if(input) {
        if(!Array.isArray(p.questions) || !p.questions.length || p.questions.length>20 || p.isBlocking!==true) throw Error('Unsupported question');
        questions=p.questions.map((q:any)=>{
          if(typeof q.id!=='string'||!q.id||q.isSecret===true||!(q.options==null||Array.isArray(q.options)))throw Error('Unsupported question');
          const options=(q.options??[]).map((o:any)=>{if(typeof o.label!=='string')throw Error('Invalid option');return o.label;});
          return {id:q.id,options,multiSelect:false,allowText:q.isOther===true||options.length===0};
        });
        if(new Set(questions!.map(q=>q.id)).size!==questions!.length)throw Error('Duplicate question id');
      } else if(typeof p.command!=='string'||typeof p.cwd!=='string'||(p.kind && p.kind!=='command'))throw Error('Unsupported approval');
      const turnKey=JSON.stringify([p.threadId,p.turnId]);let session=this.sessions.get(turnKey);
      if(!session){session=randomUUID();this.store.startSession(session,this.generation);this.sessions.set(turnKey,session);}
      const request:ApprovalRequest={id:randomUUID(),sessionId:session,generation:this.generation,nativeRequestId:key,kind:input?'input':'approval',version:1,payloadHash:hash,expiresAt:this.now()+15*60000};
      this.store.enqueue(request,this.now());this.live.set(key,{request,wireId:message.id,thread:p.threadId,turn:p.turnId,item:p.itemId,questions});return {...request};
    }
    if(!p)return;
    for(const [key,entry] of this.live) {
      if(p.threadId!==entry.thread)continue;
      if(message.method==='serverRequest/resolved' && JSON.stringify(p.requestId)===key && this.store.state(entry.request.id)==='pending')this.store.cancelRequest(entry.request.id);
      if(message.method==='item/completed' && p.turnId===entry.turn && p.item?.id===entry.item && this.store.state(entry.request.id)==='delivering') {
        // Completion proves the bound tool was released, not that its command succeeded.
        this.store.finishDelivery(entry.request.id,true);
      }
      if(message.method==='turn/completed' && p.turn?.id===entry.turn){this.store.cancelSession(entry.request.sessionId);this.live.delete(key);}
    }
  }
  respond(d:Decision,answers?:Answers):boolean {
    const entry=this.live.get(d.nativeRequestId);if(!entry||entry.request.id!==d.id)return false;
    let result:object;
    if(entry.questions) {
      if(d.action!=='answer'||!answers)return false;
      let validated:Answers;try{validated=validateAnswers(entry.questions,answers);}catch{return false;}
      result={answers:Object.fromEntries(Object.entries(validated).map(([id,values])=>[id,{answers:values}]))};
    } else {if(!['allow_once','deny'].includes(d.action))return false;result={decision:d.action==='allow_once'?'accept':'decline'};}
    if(!this.store.decide(d,this.now())||!this.store.beginDelivery(d,this.now()))return false;
    try{this.send({id:entry.wireId,result});}catch{this.store.finishDelivery(d.id,false);return false;}
    return true;
  }
  disconnect(){for(const session of this.sessions.values())this.store.cancelSession(session);this.live.clear();this.sessions.clear();}
}
