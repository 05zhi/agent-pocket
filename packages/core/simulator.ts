import { Store } from '../storage/store.js';
import type { ApprovalRequest, Decision } from './contract.js';

export function simulate() {
  const store = new Store(':memory:');
  const request: ApprovalRequest = {id:'synthetic-request',sessionId:'synthetic-session',generation:'generation-1',nativeRequestId:'native-1',version:1,payloadHash:'a'.repeat(64),expiresAt:100};
  const decision: Decision = {...request,actorId:'synthetic-user',chatId:'synthetic-private-chat',action:'allow_once'};
  try {
    store.pair(decision.actorId,decision.chatId); store.startSession(request.sessionId,request.generation);
    store.enqueue(request,0);
    const notifications=store.pendingNotifications(0).length;
    const accepted=store.decide(decision,1);
    const duplicateRejected=!store.decide(decision,1);
    const delivering=store.beginDelivery(decision,2);
    store.cancelSession(request.sessionId);
    return {mode:'simulation',notifications,accepted,duplicateRejected,delivering,
      stateAfterCancel:store.state(request.id),lateConfirmationRejected:!store.finishDelivery(request.id,true)};
  } finally { store.close(); }
}
