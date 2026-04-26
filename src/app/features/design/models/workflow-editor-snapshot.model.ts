import { Collaborator } from './collaborator.model';
import { DynamicForm } from './dynamic-form.model';
import { Invitation } from './invitation.model';
import { Workflow } from './workflow.model';
import { WorkflowTask } from './workflow-task.model';

export interface WorkflowEditorSnapshot {
  workflow: Workflow;
  canEdit: boolean;
  tasks: WorkflowTask[];
  forms: DynamicForm[];
  collaborators: Collaborator[];
  invitations: Invitation[];
}
