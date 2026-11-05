import type {NotificationChannel,NotificationResult} from '../core/notifications.js';
import {Store} from '../storage/store.js';
export class TelegramError extends Error {
  constructor(readonly code:number,readonly retryAfterMs?:number){super(`Telegram API error (${code})`);}
}
export class TelegramApi {
  constructor(private token:string,private fetcher:typeof fetch=fetch) {
    if(!/^\d+:[A-Za-z0-9_-]{20,}$/.test(token))throw Error('Invalid bot token format');
  }
  async call(method:'getMe'|'getWebhookInfo'|'getUpdates'|'sendMessage',params:object={},signal?:AbortSignal):Promise<any> {
    let response:Response;
    try {response=await this.fetcher(`https://api.telegram.org/bot${this.token}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(params),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(25000)]):AbortSignal.timeout(25000),redirect:'error'});}
    catch {throw new TelegramError(0);}
    let body:any;try{body=await response.json();}catch{throw new TelegramError(response.status>=500?response.status:0);}
    if(!response.ok||body.ok!==true)throw new TelegramError(Number(body.error_code)||response.status,Number.isFinite(body.parameters?.retry_after)?body.parameters.retry_after*1000:undefined);
    return body.result;
  }
}
export class TelegramChannel implements NotificationChannel {
  constructor(private api:TelegramApi,private store:Store){}
  async send(requestId:string,signal:AbortSignal):Promise<NotificationResult> {
    const pair=this.store.pairing();if(!pair||this.store.state(requestId)!=='pending')return {status:'failed'};
    try {await this.api.call('sendMessage',{chat_id:pair.chat,text:'Agent Pocket：Codex 工作需要你處理。請回電腦查看。',protect_content:true},signal);return {status:'sent'};}
    catch(error){if(error instanceof TelegramError && (error.code===0||error.code===429||error.code>=500))return {status:'retry',retryAfterMs:error.retryAfterMs};return {status:'failed'};}
  }
}
