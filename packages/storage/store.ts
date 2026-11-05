import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import type { ApprovalRequest, Decision, RequestState } from '../core/contract.js';

export class Store {
  private db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, generation TEXT NOT NULL, active INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS pairing(singleton INTEGER PRIMARY KEY CHECK(singleton=1), actor TEXT NOT NULL, chat TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS requests(
        id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), generation TEXT NOT NULL,
        native_id TEXT NOT NULL, version INTEGER NOT NULL, hash TEXT NOT NULL, expires INTEGER NOT NULL,
        state TEXT NOT NULL, action TEXT, UNIQUE(session_id,generation,native_id));
      CREATE TABLE IF NOT EXISTS outbox(request_id TEXT PRIMARY KEY REFERENCES requests(id), status TEXT NOT NULL DEFAULT 'pending');`);
    if (!this.db.prepare('PRAGMA table_info(requests)').all().some(r => r.name === 'kind')) this.db.exec("ALTER TABLE requests ADD COLUMN kind TEXT NOT NULL DEFAULT 'approval'");
    const columns=this.db.prepare('PRAGMA table_info(outbox)').all();
    for(const [name,definition] of [['attempts','INTEGER NOT NULL DEFAULT 0'],['next_at','INTEGER NOT NULL DEFAULT 0'],['lease','TEXT'],['lease_until','INTEGER NOT NULL DEFAULT 0']]) {
      if(!columns.some(r=>r.name===name)) this.db.exec(`ALTER TABLE outbox ADD COLUMN ${name} ${definition}`);
    }
  }
  close() { this.db.close(); }
  private transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const value = fn(); this.db.exec('COMMIT'); return value; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  pair(actor: string, chat: string) {
    if (!actor || !chat) throw new Error('Invalid pairing');
    this.db.prepare('INSERT OR REPLACE INTO pairing VALUES(1,?,?)').run(actor, chat);
  }
  revokePairing() { this.db.exec('DELETE FROM pairing'); }
  startSession(id: string, generation: string) {
    if (!id || !generation) throw new Error('Invalid session');
    this.db.prepare('INSERT INTO sessions VALUES(?,?,1)').run(id, generation);
  }
  enqueue(r: ApprovalRequest, now: number): boolean {
    if (!r.id || !r.nativeRequestId || !Number.isSafeInteger(r.version) || r.version < 1 || !/^[a-f0-9]{64}$/.test(r.payloadHash) || !Number.isSafeInteger(r.expiresAt) || r.expiresAt <= now) throw new Error('Invalid request');
    return this.transaction(() => {
      if (!this.db.prepare('SELECT 1 FROM sessions WHERE id=? AND generation=? AND active=1').get(r.sessionId, r.generation)) throw new Error('Inactive session');
      const existing = this.db.prepare('SELECT * FROM requests WHERE id=? OR (session_id=? AND generation=? AND native_id=?)').get(r.id, r.sessionId, r.generation, r.nativeRequestId);
      if (existing) {
        if (existing.kind === (r.kind ?? 'approval') && existing.id === r.id && existing.hash === r.payloadHash && existing.version === r.version && existing.session_id === r.sessionId && existing.generation === r.generation && existing.native_id === r.nativeRequestId && existing.expires === r.expiresAt) return false;
        throw new Error('Request identity conflict');
      }
      this.db.prepare("INSERT INTO requests VALUES(?,?,?,?,?,?,?,'pending',NULL,?)").run(r.id,r.sessionId,r.generation,r.nativeRequestId,r.version,r.payloadHash,r.expiresAt,r.kind ?? 'approval');
      this.db.prepare('INSERT INTO outbox(request_id) VALUES(?)').run(r.id);
      return true;
    });
  }
  decide(d: Decision, now: number): boolean {
    if (!['allow_once','deny','answer'].includes(d.action)) return false;
    const kind = this.db.prepare('SELECT kind FROM requests WHERE id=?').get(d.id)?.kind;
    if ((d.action === 'answer') !== (kind === 'input')) return false;
    return this.transaction(() => {
      if (!this.db.prepare('SELECT 1 FROM pairing WHERE actor=? AND chat=?').get(d.actorId,d.chatId)) return false;
      this.expire(now);
      const result = this.db.prepare(`UPDATE requests SET state='decision_received', action=? WHERE id=? AND session_id=? AND generation=? AND native_id=? AND version=? AND hash=? AND expires=? AND expires>? AND state='pending'
        AND EXISTS(SELECT 1 FROM sessions s WHERE s.id=requests.session_id AND s.generation=requests.generation AND s.active=1)`)
        .run(d.action,d.id,d.sessionId,d.generation,d.nativeRequestId,d.version,d.payloadHash,d.expiresAt,now);
      return result.changes === 1;
    });
  }
  expire(now: number) { this.db.prepare("UPDATE requests SET state='expired' WHERE state IN ('pending','decision_received') AND expires<=?").run(now); }
  cancelSession(id: string) {
    this.transaction(() => {
      this.db.prepare('UPDATE sessions SET active=0 WHERE id=?').run(id);
      this.db.prepare("UPDATE requests SET state=CASE WHEN state='delivering' THEN 'outcome_unknown' ELSE 'cancelled' END WHERE session_id=? AND state IN ('pending','decision_received','delivering')").run(id);
    });
  }
  beginDelivery(d: Decision, now: number): boolean {
    return this.transaction(() => {
      this.expire(now);
      return this.db.prepare(`UPDATE requests SET state='delivering' WHERE id=? AND session_id=? AND generation=? AND native_id=? AND version=? AND hash=? AND expires=? AND expires>? AND state='decision_received' AND action=?
        AND EXISTS(SELECT 1 FROM sessions s WHERE s.id=requests.session_id AND s.active=1 AND s.generation=requests.generation)
        AND EXISTS(SELECT 1 FROM pairing WHERE actor=? AND chat=?)`)
        .run(d.id,d.sessionId,d.generation,d.nativeRequestId,d.version,d.payloadHash,d.expiresAt,now,d.action,d.actorId,d.chatId).changes === 1;
    });
  }
  finishDelivery(id: string, confirmed: boolean) {
    return this.db.prepare("UPDATE requests SET state=? WHERE id=? AND state='delivering'").run(confirmed ? 'resolved' : 'outcome_unknown',id).changes === 1;
  }
  recoverAfterRestart() {
    this.transaction(() => {
      this.db.exec("UPDATE sessions SET active=0; UPDATE requests SET state=CASE WHEN state='delivering' THEN 'outcome_unknown' ELSE 'cancelled' END WHERE state IN ('pending','decision_received','delivering');");
    });
  }
  state(id: string): RequestState | undefined { return this.db.prepare('SELECT state FROM requests WHERE id=?').get(id)?.state as RequestState | undefined; }
  pendingNotifications(now: number): string[] {
    this.expire(now);
    return this.db.prepare("SELECT r.id FROM outbox o JOIN requests r ON r.id=o.request_id WHERE o.status='pending' AND r.state='pending'").all().map(row => row.id as string);
  }
  markNotified(id: string) { this.db.prepare("UPDATE outbox SET status='sent' WHERE request_id=?").run(id); }
  claimNotification(now: number): {id:string;lease:string;attempts:number} | undefined {
    return this.transaction(()=>{
      this.expire(now);
      this.db.prepare("UPDATE outbox SET status='failed' WHERE attempts>=5 AND lease_until<=?").run(now);
      const row=this.db.prepare(`SELECT o.request_id,o.attempts FROM outbox o JOIN requests r ON r.id=o.request_id
        WHERE r.state='pending' AND o.attempts<5 AND ((o.status='pending' AND o.next_at<=?) OR (o.status='sending' AND o.lease_until<=?)) ORDER BY o.next_at LIMIT 1`).get(now,now);
      if(!row) return;
      const lease=randomUUID();
      this.db.prepare("UPDATE outbox SET status='sending', attempts=attempts+1, lease=?,lease_until=? WHERE request_id=?").run(lease,now+30000,row.request_id);
      return {id:row.request_id as string,lease,attempts:Number(row.attempts)+1};
    });
  }
  settleNotification(id:string,lease:string,result:'sent'|'retry'|'failed',nextAt:number) {
    return this.db.prepare("UPDATE outbox SET status=?,next_at=?,lease=NULL,lease_until=0 WHERE request_id=? AND lease=? AND status='sending'").run(result==='retry'?'pending':result,nextAt,id,lease).changes===1;
  }
  notification(id:string) { return this.db.prepare('SELECT status,attempts,next_at FROM outbox WHERE request_id=?').get(id); }
}
