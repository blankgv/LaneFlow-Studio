export interface WorkflowHistoryEntry {
  id: string;
  workflowDefinitionId: string;
  eventType: string;
  description: string;
  performedBy: string;
  occurredAt: string;
}
