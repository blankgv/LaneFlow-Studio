export type ProcedureStatus = 'STARTED' | 'IN_PROGRESS' | 'OBSERVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';

export interface ProcedureStartPayload {
  workflowDefinitionId: string;
  applicantId: string;
  formData: Record<string, unknown>;
}

export interface ProcedureInstance {
  id: string;
  code: string;
  workflowDefinitionId: string;
  workflowCode?: string | null;
  workflowName: string;
  workflowVersion?: number;
  camundaProcessKey?: string | null;
  camundaProcessInstanceId?: string | null;
  previousCamundaProcessInstanceId?: string | null;
  applicantId: string;
  applicantDocumentNumber?: string | null;
  applicantName: string;
  status: ProcedureStatus;
  currentTaskId: string | null;
  currentNodeId: string | null;
  currentNodeName: string | null;
  currentAssigneeUsername: string | null;
  claimedAt?: string | null;
  formData: Record<string, unknown>;
  lastAction?: string | null;
  lastComment?: string | null;
  lastCompletedTaskId?: string | null;
  lastCompletedNodeId?: string | null;
  lastCompletedTaskName?: string | null;
  lastCompletedBy?: string | null;
  lastCompletedAt?: string | null;
  resubmissionCount?: number;
  resolvedObservationBy?: string | null;
  resolvedObservationAt?: string | null;
  resolvedObservationComment?: string | null;
  startedBy?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ProcedureResolveObservationPayload {
  comment: string;
  formData: Record<string, unknown>;
}

export interface ProcedureStatusInfo {
  procedureId: string;
  procedureCode: string;
  workflowName: string;
  applicantName: string;
  currentStatus: ProcedureStatus;
  currentStage: string;
  statusMessage: string;
  currentAssigneeUsername: string | null;
  lastEventTitle: string | null;
  lastEventMessage: string | null;
  startedAt: string | null;
  lastUpdatedAt: string | null;
  completedAt: string | null;
}

export interface ProcedureHistory {
  procedureId: string;
  procedureCode: string;
  workflowName: string;
  applicantName: string;
  currentStatus: ProcedureStatus;
  startedAt: string | null;
  completedAt: string | null;
  history: ProcedureHistoryItem[];
}

export interface ProcedureHistoryItem {
  id: string;
  action: string;
  title: string;
  message: string;
  username: string | null;
  taskId: string | null;
  nodeId: string | null;
  nodeName: string | null;
  statusBefore: ProcedureStatus | null;
  statusAfter: ProcedureStatus | null;
  metadata: Record<string, unknown>;
  createdAt: string | null;
}
