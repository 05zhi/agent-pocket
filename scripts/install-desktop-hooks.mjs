import {existsSync,readFileSync,writeFileSync,mkdirSync,copyFileSync,renameSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {homedir} from 'node:os';
import {mergeHooks} from './desktop-hook-lib.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const target=join(process.env.CODEX_HOME || join(homedir(),'.codex'),'hooks.json');
const existing=existsSync(target)?readFileSync(target,'utf8'):null;
// Forward slashes avoid shell-specific backslash parsing. Reject shell metacharacters.
const quoted=value=>{
  if(/["`$%\r\n]/.test(value))throw Error('Unsupported shell characters in install path');
  return `"${value.replaceAll('\\','/')}"`;
};
// A quoted executable path alone is not invokable in PowerShell. node on PATH
// works in both cmd.exe and PowerShell; the script path remains absolute.
const command=`node --disable-warning=ExperimentalWarning ${quoted(resolve(root,'scripts/desktop-hook.mjs'))}`;
const merged=JSON.stringify(mergeHooks(existing?JSON.parse(existing):{},command),null,2)+'\n';
mkdirSync(join(root,'.cache'),{recursive:true});
writeFileSync(join(root,'.cache/desktop-hooks.preview.json'),merged);
if(process.argv.includes('--install')) {
  mkdirSync(resolve(target,'..'),{recursive:true});
  if(existing!==merged) {
    if(existing!==null)copyFileSync(target,`${target}.agent-pocket-backup-${Date.now()}`);
    const temp=`${target}.agent-pocket-${process.pid}.tmp`;
    writeFileSync(temp,merged,{flag:'wx'});renameSync(temp,target);
  }
  console.log('Installed notification hooks. Review and trust them in Codex Settings > Hooks; no trust or approval policy was changed.');
} else console.log('Preview prepared in .cache/desktop-hooks.preview.json. Use --install to merge into user hooks.json.');
