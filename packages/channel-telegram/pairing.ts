import {randomBytes,timingSafeEqual} from 'node:crypto';
export type Candidate={actor:string;chat:string};
export class PairingChallenge {
  readonly code=randomBytes(9).toString('base64url');
  private used=false; private attempts=0;
  constructor(private expiresAt=Date.now()+300000) {}
  accept(update:any,now=Date.now()):Candidate|undefined {
    if(this.used||now>=this.expiresAt||this.attempts>=20)return;
    const m=update?.message;
    if(m?.chat?.type!=='private'||m?.from?.is_bot!==false||!Number.isSafeInteger(m.from.id)||m.from.id<=0||m.from.id!==m.chat.id||typeof m.text!=='string'||m.forward_origin)return;
    this.attempts++;
    const value=m.text.trim().replace(/^\/start\s+/,'');const bytes=Buffer.from(value),expected=Buffer.from(this.code);
    if(bytes.length!==expected.length||!timingSafeEqual(bytes,expected))return;
    this.used=true;return {actor:String(m.from.id),chat:String(m.chat.id)};
  }
}
