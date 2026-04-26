import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { Collaborator, Invitee } from '../models/collaborator.model';
import { Invitation, InvitationPayload } from '../models/invitation.model';
import { Workflow } from '../models/workflow.model';
import { WorkflowCreatePayload, WorkflowUpdatePayload } from '../models/workflow-payload.model';
import { WorkflowEditorSnapshot } from '../models/workflow-editor-snapshot.model';
import { WorkflowHistoryEntry } from '../models/workflow-history.model';
import { WorkflowSummary } from '../models/workflow-summary.model';
import { WorkflowVersion, WorkflowVersionPayload } from '../models/workflow-version.model';

@Injectable({
  providedIn: 'root'
})
export class WorkflowApiService {
  private readonly api = inject(ApiService);

  // --- Politicas ---

  getWorkflows(): Observable<WorkflowSummary[]> {
    return this.api.get<WorkflowSummary[]>('/workflows');
  }

  getWorkflow(id: string): Observable<Workflow> {
    return this.api.get<Workflow>(`/workflows/${id}`);
  }

  createWorkflow(payload: WorkflowCreatePayload): Observable<Workflow> {
    return this.api.post<Workflow>('/workflows', payload);
  }

  updateWorkflow(id: string, payload: WorkflowUpdatePayload): Observable<Workflow> {
    return this.api.put<Workflow>(`/workflows/${id}`, payload);
  }

  publishWorkflow(id: string): Observable<Workflow> {
    return this.api.post<Workflow>(`/workflows/${id}/publish`, {});
  }

  validateWorkflow(id: string): Observable<void> {
    return this.api.get<void>(`/workflows/${id}/validate`);
  }

  getEditorSnapshot(id: string): Observable<WorkflowEditorSnapshot> {
    return this.api.get<WorkflowEditorSnapshot>(`/workflows/${id}/editor`);
  }

  // --- Versiones ---

  getVersions(workflowId: string): Observable<WorkflowVersion[]> {
    return this.api.get<WorkflowVersion[]>(`/workflows/${workflowId}/versions`);
  }

  getVersion(workflowId: string, versionNumber: number): Observable<WorkflowVersion> {
    return this.api.get<WorkflowVersion>(`/workflows/${workflowId}/versions/${versionNumber}`);
  }

  createVersion(workflowId: string, payload: WorkflowVersionPayload): Observable<WorkflowVersion> {
    return this.api.post<WorkflowVersion>(`/workflows/${workflowId}/versions`, payload);
  }

  publishVersion(workflowId: string, versionNumber: number): Observable<Workflow> {
    return this.api.post<Workflow>(`/workflows/${workflowId}/versions/${versionNumber}/publish`, {});
  }

  // --- Colaboradores ---

  getCollaborators(workflowId: string): Observable<Collaborator[]> {
    return this.api.get<Collaborator[]>(`/workflows/${workflowId}/collaborators`);
  }

  getInvitees(workflowId: string): Observable<Invitee[]> {
    return this.api.get<Invitee[]>(`/workflows/${workflowId}/invitees`);
  }

  // --- Invitaciones de una politica ---

  getInvitations(workflowId: string): Observable<Invitation[]> {
    return this.api.get<Invitation[]>(`/workflows/${workflowId}/invitations`);
  }

  inviteCollaborator(workflowId: string, payload: InvitationPayload): Observable<Invitation> {
    return this.api.post<Invitation>(`/workflows/${workflowId}/invitations`, payload);
  }

  // --- Invitaciones del usuario autenticado ---

  getMyInvitations(): Observable<Invitation[]> {
    return this.api.get<Invitation[]>('/workflow-invitations/mine');
  }

  acceptInvitation(invitationId: string): Observable<Invitation> {
    return this.api.post<Invitation>(`/workflow-invitations/${invitationId}/accept`, {});
  }

  rejectInvitation(invitationId: string): Observable<Invitation> {
    return this.api.post<Invitation>(`/workflow-invitations/${invitationId}/reject`, {});
  }

  // --- Historial ---

  getHistory(workflowId: string): Observable<WorkflowHistoryEntry[]> {
    return this.api.get<WorkflowHistoryEntry[]>(`/workflows/${workflowId}/history`);
  }
}
