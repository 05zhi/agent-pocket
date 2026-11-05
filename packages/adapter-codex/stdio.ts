import {spawn,type ChildProcessWithoutNullStreams} from 'node:child_process';
import {createInterface} from 'node:readline';
import {EventEmitter} from 'node:events';
export class CodexStdio extends EventEmitter {
 private sequence=0;private ended=false;
 private pending=new Map<number,{resolve:(v:any)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
 constructor(private child:ChildProcessWithoutNullStreams=spawn('codex',['app-server','--listen','stdio://'],{stdio:'pipe'})){
  super();child.stderr.on('data',()=>{});
  createInterface({input:child.stdout}).on('line',line=>{
   let m:any;try{m=JSON.parse(line);}catch{this.stop();return;}
   if(!m.method&&this.pending.has(m.id)){
    const p=this.pending.get(m.id)!;this.pending.delete(m.id);clearTimeout(p.timer);
    m.error?p.reject(Error(`Codex RPC error ${m.error.code}`)):p.resolve(m.result);
   }else this.emit('message',m);
  });
  child.on('error',()=>this.finish());child.on('exit',()=>this.finish());child.stdin.on('error',()=>this.finish());
 }
 send(message:object){if(this.ended)throw Error('Codex disconnected');this.child.stdin.write(JSON.stringify(message)+'\n');}
 rpc(method:string,params:object,timeout=30000):Promise<any>{
  if(this.ended)return Promise.reject(Error('Codex disconnected'));
  return new Promise((resolve,reject)=>{const id=++this.sequence;const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('Codex RPC timeout'));},timeout);
   this.pending.set(id,{resolve,reject,timer});try{this.send({id,method,params});}catch{clearTimeout(timer);this.pending.delete(id);reject(Error('Codex disconnected'));}
  });
 }
 private finish(){if(this.ended)return;this.ended=true;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('Codex disconnected'));}this.pending.clear();this.emit('disconnect');}
 stop(){this.finish();this.child.kill();}
}
