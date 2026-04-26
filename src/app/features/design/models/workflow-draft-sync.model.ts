export interface WorkflowDraftSync {
  workflowId: string;
  eventType: 'DRAFT_SAVED';
  bpmnXml: string;
  lastModifiedBy: string;
  updatedAt: string;
}
