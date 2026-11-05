// No stdout, decisions, transcript reads, or inbound Telegram polling.
import {readFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {notification,deliver} from './desktop-hook-lib.mjs';
import {TelegramApi} from '../dist/packages/channel-telegram/api.js';

const root=fileURLToPath(new URL('../',import.meta.url));
let ledger;
try {
  const chunks=[];let size=0;
  for await (const chunk of process.stdin) {
    size+=chunk.length;if(size>1024*1024)throw Error('Event too large');chunks.push(chunk);
  }
  const note=notification(JSON.parse(Buffer.concat(chunks).toString('utf8')));
  if(note) {
    process.loadEnvFile(join(root,'.env'));
    const api=new TelegramApi(process.env.TELEGRAM_BOT_TOKEN ?? '');
    const cursor=JSON.parse(readFileSync(join(root,'.cache/telegram-cursor.json'),'utf8'));
    if(String(cursor.botId)!==process.env.TELEGRAM_BOT_TOKEN.split(':')[0])throw Error('Bot identity changed');
    mkdirSync(join(root,'.cache'),{recursive:true});
    ledger=new DatabaseSync(join(root,'.cache/desktop-notifications.sqlite'));
    ledger.exec(`PRAGMA busy_timeout=2000;
      CREATE TABLE IF NOT EXISTS notifications(key TEXT PRIMARY KEY,kind TEXT NOT NULL,status TEXT NOT NULL,created_at INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0);
      DELETE FROM notifications WHERE created_at < (unixepoch()*1000 - 2592000000);`);
    const claimed=ledger.prepare("INSERT OR IGNORE INTO notifications(key,kind,status,created_at) VALUES(?,?,'sending',?)").run(note.key,note.kind,Date.now());
    if(claimed.changes) {
      const result=await deliver(async()=>{
        // Recheck current pairing for every attempt; never write the managed-task DB.
        const db=new DatabaseSync(join(root,'.cache/telegram.sqlite'),{readOnly:true});
        let pair;
        try {pair=db.prepare('SELECT chat FROM pairing WHERE singleton=1').get();} finally {db.close();}
        if(!pair)throw Error('Not paired');
        await api.call('sendMessage',{chat_id:pair.chat,text:note.text,protect_content:true},AbortSignal.timeout(2500));
      });
      ledger.prepare('UPDATE notifications SET status=?,attempts=? WHERE key=?').run(result.status,result.attempts,note.key);
    }
  }
} catch {
  // No exception details: errors could contain credentials or original input.
  process.stderr.write('Agent Pocket notification unavailable; use the desktop prompt.\n');
} finally {ledger?.close();}
// Always defer to the original desktop prompt, even when Telegram is unavailable.
