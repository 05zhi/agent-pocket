import type {ApprovalRequest} from './contract.js';
import {parseQuestionReply} from '../channel-telegram/inbox.js';
import {Store} from '../storage/store.js';
import {CodexBridge} from '../adapter-codex/bridge.js';
export function replyLocally(line:string,payloads:Map<string,{request:ApprovalRequest;params:any}>,store:Store,bridge:CodexBridge):boolean {
 const match=/^\/reply\s+(\S+)\s+([\s\S]+)$/.exec(line);if(!match)return false;
 const data=payloads.get(match[1]),pair=store.pairing();if(!data||!pair)return false;
 const value=match[2];const d={...data.request,actorId:pair.actor,chatId:pair.chat};
 if(data.request.kind==='input'){
  try{return bridge.respond({...d,action:'answer'},parseQuestionReply(data.params.questions,value));}catch{return false;}
 }
 if(value==='allow')return bridge.respond({...d,action:'allow_once'});
 if(value==='deny')return bridge.respond({...d,action:'deny'});
 if(value==='cancel')return bridge.respond({...d,action:'cancel'});
 return false;
}
