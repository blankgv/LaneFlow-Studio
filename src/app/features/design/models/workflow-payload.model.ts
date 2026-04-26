export interface WorkflowCreatePayload {
  code: string;
  name: string;
  description: string | null;
  bpmnXml: string;
}

export interface WorkflowUpdatePayload {
  name: string;
  description: string | null;
  bpmnXml: string;
}
