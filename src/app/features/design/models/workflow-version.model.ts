export interface WorkflowVersion {
  versionNumber: number;
  bpmnXml: string;
  publishedAt: string | null;
  createdAt: string;
  createdBy: string;
}

export interface WorkflowVersionPayload {
  bpmnXml: string;
}
