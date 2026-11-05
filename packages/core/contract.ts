export type RequestState = 'pending' | 'decision_received' | 'delivering' | 'resolved' | 'expired' | 'cancelled' | 'outcome_unknown';
export interface ApprovalRequest {
  id: string; sessionId: string; generation: string; nativeRequestId: string;
  version: number; payloadHash: string; expiresAt: number;
}
export interface Decision extends ApprovalRequest {
  actorId: string; chatId: string; action: 'allow_once' | 'deny';
}
export interface AdapterCapabilities {
  version: string; supportsApproval: boolean; supportsQuestions: boolean;
  supportsCancel: boolean; supportsReconcile: boolean;
}
// A successful socket write is not an acknowledgement from the original tool.
export interface ApprovalAdapter {
  capabilities: AdapterCapabilities;
  deliver(request: ApprovalRequest, action: Decision['action']): Promise<'confirmed' | 'unknown'>;
}
