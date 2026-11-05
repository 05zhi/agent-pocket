import { Store } from '../storage/store.js';
export type NotificationResult = {status:'sent'} | {status:'retry';retryAfterMs?:number} | {status:'failed'};
export interface NotificationChannel { send(requestId:string,signal:AbortSignal):Promise<NotificationResult> }
export async function notifyOnce(store:Store,channel:NotificationChannel,now:()=>number=Date.now,random:()=>number=Math.random) {
  const job=store.claimNotification(now()); if(!job) return false;
  if(store.state(job.id)!=='pending') { store.settleNotification(job.id,job.lease,'failed',now());return false; }
  const controller=new AbortController(); let timer:ReturnType<typeof setTimeout> | undefined;
  let result:NotificationResult;
  try {
    result=await Promise.race([channel.send(job.id,controller.signal),new Promise<NotificationResult>(resolve=>{
      timer=setTimeout(()=>{controller.abort();resolve({status:'retry'});},10000);
    })]);
  } catch { result={status:'retry'}; }
  finally { clearTimeout(timer); }
  const retryAfter=result.status==='retry' && Number.isFinite(result.retryAfterMs) ? Math.max(0,result.retryAfterMs!) : 0;
  const delay=Math.max(retryAfter,Math.min(60000,1000*2**(job.attempts-1))*(0.5+Math.max(0,Math.min(1,random()))/2));
  store.settleNotification(job.id,job.lease,result.status==='retry' && job.attempts>=5 ? 'failed':result.status,Math.ceil(now()+delay));
  return true;
}
