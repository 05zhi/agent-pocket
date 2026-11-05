import {existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';

const root=fileURLToPath(new URL('../',import.meta.url));
const target=join(process.env.CODEX_HOME || join(homedir(),'.codex'),'hooks.json');
const config=existsSync(target)?JSON.parse(readFileSync(target,'utf8')):{};
const configured={};
for(const name of ['PermissionRequest','PreToolUse']) {
  configured[name]=(config.hooks?.[name]??[]).some(group=>group.description==='agent-pocket-desktop-notify');
}
const path=join(root,'.cache/desktop-notifications.sqlite');
let events=[];
if(existsSync(path)) {
  const db=new DatabaseSync(path,{readOnly:true});
  try {events=db.prepare('SELECT kind,status,count(*) AS count,max(created_at) AS latestAt FROM notifications GROUP BY kind,status').all();}
  finally {db.close();}
}
console.log(JSON.stringify({configured,trust:'Check Codex Settings > Hooks',events,phoneVisibility:'Requires user confirmation; sent means API accepted only'},null,2));
