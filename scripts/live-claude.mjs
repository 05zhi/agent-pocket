// Explicit opt-in; no transcript or credential is written to disk.
import { query } from '@anthropic-ai/claude-agent-sdk';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const scenario = process.argv[2];
if (!['approval', 'question'].includes(scenario)) throw new Error('Specify approval or question');
const cwd = resolve('.cache/live-claude');
mkdirSync(cwd, { recursive: true });
const evidence = { provider: 'claude', scenario, requestSeen: false, responseSent: false, resumed: false, completed: false, passed: false };
const abortController = new AbortController();
const timeout = setTimeout(() => abortController.abort(), 120000);
try {
  const stream = query({ prompt: scenario === 'question'
    ? 'Call AskUserQuestion to choose POCKET_BLUE or POCKET_GREEN. Repeat the selected answer and finish. Do not call other tools.'
    : "Call Bash with exactly: printf AGENT_POCKET_APPROVAL_OK. If denied do not retry; say REQUEST_DENIED and finish.",
    options: { cwd, settingSources: [], permissionMode: 'default', persistSession: false, maxTurns: 4, maxBudgetUsd: 0.5,
      tools: scenario === 'question' ? ['AskUserQuestion'] : ['Bash'], abortController,
      canUseTool: async (name, input) => {
        if (name === 'AskUserQuestion' && scenario === 'question') {
          evidence.requestSeen = true; evidence.responseSent = true;
          return { behavior: 'allow', updatedInput: { ...input, answers: Object.fromEntries(input.questions.map(q => [q.question, 'POCKET_BLUE'])) } };
        }
        if (name === 'Bash' && scenario === 'approval') {
          evidence.requestSeen = true; evidence.responseSent = true; evidence.decision = 'deny';
        }
        return { behavior: 'deny', message: 'M0 synthetic test: user declined. Do not retry.' };
      }
    } });
  for await (const message of stream) {
    if (message.type === 'assistant' && evidence.responseSent) {
      const text = message.message.content.filter(x => x.type === 'text').map(x => x.text).join('');
      if (text.includes(scenario === 'question' ? 'POCKET_BLUE' : 'REQUEST_DENIED')) evidence.resumed = true;
    }
    if (message.type === 'result') { evidence.completed = message.subtype === 'success' && !message.is_error; evidence.outcome = message.subtype; }
  }
  evidence.passed = evidence.requestSeen && evidence.responseSent && evidence.resumed && evidence.completed;
} catch (error) { evidence.outcome = /Not logged in/.test(error.message) ? 'not_logged_in' : 'sdk_error_check_local_authentication_and_runtime'; }
finally {
  clearTimeout(timeout);
  writeFileSync(`.cache/claude-${scenario}-evidence.json`, JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence, null, 2)); process.exitCode = evidence.passed ? 0 : 1;
}
