export type WorkflowStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface Workflow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  currentVersion: number;
  camundaProcessKey: string;
  draftBpmnXml: string;
  publishedVersionNumber: number | null;
  swimlanes: unknown[];
  nodes: unknown[];
  transitions: unknown[];
  createdBy: string;
  lastModifiedBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}
