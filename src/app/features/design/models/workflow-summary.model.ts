import { WorkflowStatus } from './workflow.model';

export interface WorkflowSummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  currentVersion: number;
  publishedVersionNumber: number | null;
  createdAt: string;
  updatedAt: string;
}
