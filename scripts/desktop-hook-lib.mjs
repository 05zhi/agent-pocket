import {createHash,randomUUID} from 'node:crypto';

// Exact function names only. Hosted/specialized tools may bypass hooks entirely.
export const questionMatcher = '(^|[.:/])request_user_input(_async)?$';
export function classify(event) {
  if (!event || typeof event.session_id !== 'string' || !event.session_id) return;
  if (event.hook_event_name === 'PermissionRequest') return 'approval';
  if (event.hook_event_name === 'PreToolUse' && new RegExp(questionMatcher).test(event.tool_name ?? '')) return 'question';
}
export function notification(event) {
  const kind = classify(event);
  if (!kind) return;
  const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const session = digest(event.session_id).slice(0, 8);
  // Do not persist prompts, commands, paths, answers, or native session IDs.
  // PermissionRequest may lack an invocation ID. Identical commands can prompt
  // twice legitimately; never dedup separate requests based on their contents.
  const key = digest([event.session_id,event.turn_id,kind,event.tool_use_id || randomUUID()]);
  const text=kind==='approval'
    ? `Agent Pocket：Codex 發出核准請求。\n若電腦顯示核准框，請回電腦處理；此請求也可能由自動審查處理。聊天室識別：${session}`
    : `Agent Pocket：Codex 桌面聊天室需要你回答問題。\n請回電腦處理。聊天室識別：${session}`;
  return {key,kind,text};
}

export async function deliver(send, {sleep = ms => new Promise(r => setTimeout(r,ms)), attempts = 3} = {}) {
  for (let attempt=1; attempt<=attempts; attempt++) {
    try { await send(); return {status:'sent',attempts:attempt}; }
    catch (error) {
      const retryable = error?.code === 0 || error?.code === 429 || error?.code >= 500;
      const delay = error?.retryAfterMs ?? 500 * 2 ** (attempt-1);
      // Never keep a hook alive for long server rate-limit windows.
      if (!retryable || attempt===attempts || delay>2000) return {status:'failed',attempts:attempt};
      await sleep(delay);
    }
  }
}

export function mergeHooks(existing, command) {
  const result = structuredClone(existing);
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw Error('Invalid hooks configuration');
  result.hooks ??= {};
  if (typeof result.hooks !== 'object' || Array.isArray(result.hooks)) throw Error('Invalid hooks map');
  for (const [event,matcher] of [['PermissionRequest','*'],['PreToolUse',questionMatcher]]) {
    const groups = result.hooks[event] ?? [];
    if (!Array.isArray(groups)) throw Error('Invalid hook groups');
    // Only replace our explicitly tagged groups. Preserve all other hooks.
    result.hooks[event] = groups.filter(g => g.description !== 'agent-pocket-desktop-notify');
    result.hooks[event].push({description:'agent-pocket-desktop-notify',matcher,hooks:[{
      type:'command',command,commandWindows:command,async:true,timeout:15,
      statusMessage:'Agent Pocket notification only'
    }]});
  }
  return result;
}
