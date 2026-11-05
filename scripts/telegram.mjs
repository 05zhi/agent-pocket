import {mkdirSync,openSync,closeSync,unlinkSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createInterface} from 'node:readline/promises';
import {Store} from '../dist/packages/storage/store.js';
import {TelegramApi} from '../dist/packages/channel-telegram/api.js';
import {PairingChallenge} from '../dist/packages/channel-telegram/pairing.js';
import {TelegramChannel} from '../dist/packages/channel-telegram/api.js';
import {notifyOnce} from '../dist/packages/core/notifications.js';
const command=process.argv[2];
if(!['pair','test','status','unpair','drain'].includes(command))throw Error('Usage: telegram.mjs pair|test|status|unpair|drain');
mkdirSync('.cache',{recursive:true});
let lock,store,rl;
try {
 lock=openSync('.cache/telegram.lock','wx');writeFileSync(lock,String(process.pid));
 store=new Store('.cache/telegram.sqlite');
 if(command==='unpair'){store.revokePairing();console.log('Pairing revoked locally.');}
 else {
 const api=new TelegramApi(process.env.TELEGRAM_BOT_TOKEN??'');
 const me=await api.call('getMe');
 const stateFile='.cache/telegram-cursor.json';
 let cursor=existsSync(stateFile)?JSON.parse(readFileSync(stateFile,'utf8')):{botId:me.id,offset:0};
 if(cursor.botId!==me.id)throw Error('Bot changed. Unpair and remove local telegram-cursor.json before setting up the new bot.');
 const save=()=>writeFileSync(stateFile,JSON.stringify(cursor));
 save();
 if(command==='status')console.log(JSON.stringify({bot:me.username,paired:!!store.pairing(),phoneDelivery:'not inferred from API response'}));
 if(command==='pair') {
  if(store.pairing())throw Error('Already paired. Run unpair before replacing the pairing.');
  const webhook=await api.call('getWebhookInfo');if(webhook.url)throw Error('Bot has a webhook; use a dedicated bot. No webhook was changed.');
  const expires=Date.now()+300000;const challenge=new PairingChallenge(expires);
  console.log(`Send this code to @${me.username} in a PRIVATE chat within 5 minutes: ${challenge.code}`);
  let candidate;
  while(Date.now()<expires&&!candidate){
   const updates=await api.call('getUpdates',{offset:cursor.offset,timeout:20,allowed_updates:['message']});
   for(const update of updates){
    if(!Number.isSafeInteger(update.update_id)||update.update_id<cursor.offset)continue;
    cursor.offset=update.update_id+1;save();
    candidate=challenge.accept(update);if(candidate)break;
   }
  }
  if(!candidate)throw Error('Pairing expired or no valid private code received.');
  rl=createInterface({input:process.stdin,output:process.stdout});
  const yes=await rl.question(`Local confirmation: bind Telegram user ${candidate.actor}, private chat ${candidate.chat}? Type YES: `);
  if(yes!=='YES'||Date.now()>=expires)throw Error('Pairing not confirmed or expired.');
  store.pair(candidate.actor,candidate.chat);console.log('Pairing saved. Run test to send a test notification.');
 }
 if(command==='test') {
  const pair=store.pairing();if(!pair)throw Error('Pair first.');
  await api.call('sendMessage',{chat_id:pair.chat,text:'Agent Pocket 測試通知：Telegram API 已接受傳送；請在手機確認是否看見。',protect_content:true});
  console.log('Telegram API accepted the test message. Phone visibility still requires your confirmation.');
 }
 if(command==='drain') {
  // One bounded pass. A future managed-session daemon can call notifyOnce continuously.
  const channel=new TelegramChannel(api,store);let count=0;
  while(count<100&&await notifyOnce(store,channel))count++;
  console.log(JSON.stringify({processed:count}));
 }
 }
}catch(error){console.error(error?.code==='EEXIST'?'Another local Telegram process holds the lock.':error.message);process.exitCode=1;}
finally{rl?.close();store?.close();if(lock!==undefined){closeSync(lock);unlinkSync('.cache/telegram.lock');}}
