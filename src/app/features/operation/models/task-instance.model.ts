import { DynamicForm } from '../../design/models/dynamic-form.model';

export type TaskStatus = 'AVAILABLE' | 'CLAIMED' | 'COMPLETED';

export interface TaskInstance {
  taskId: string;
  taskName: string;
  processInstanceId: string;
  workflowId: string;
  workflowName: string;
  departmentCode: string | null;
  departmentName: string | null;
  assignee: string | null;
  claimedAt: string | null;
  createdAt: string;
  dueDate: string | null;
  form: DynamicForm | null;
}
