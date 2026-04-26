export interface WorkflowTask {
  nodeId: string;
  nodeName: string;
  swimlaneId: string;
  departmentId: string | null;
  departmentCode: string;
  departmentName: string;
  requiredAction: string | null;
  formId: string | null;
  formTitle: string | null;
}
