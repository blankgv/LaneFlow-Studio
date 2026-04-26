import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, EventEmitter,
  Input, OnInit, Output, inject, signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ApiError } from '../../../../core/models/api-error.model';
import { Collaborator, Invitee } from '../../models/collaborator.model';
import { Invitation } from '../../models/invitation.model';
import { WorkflowApiService } from '../../services/workflow-api.service';

@Component({
  selector: 'app-collaborators-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule],
  template: `
    <div class="collab-panel">

      <!-- Colaboradores activos -->
      <div class="panel-section-title">Colaboradores</div>

      <ul class="collab-list" *ngIf="collaborators.length > 0">
        <li *ngFor="let c of collaborators" class="collab-item">
          <span class="collab-avatar">{{ initials(c.username) }}</span>
          <div class="collab-info">
            <span class="collab-name">{{ c.username }}</span>
            <span class="collab-email">{{ c.email }}</span>
          </div>
        </li>
      </ul>
      <div class="collab-empty" *ngIf="collaborators.length === 0">
        Sin colaboradores aun.
      </div>

      <!-- Invitaciones pendientes -->
      <div class="panel-section-title panel-section-title--mt" *ngIf="pendingInvitations().length > 0">
        Invitaciones pendientes
      </div>
      <ul class="collab-list" *ngIf="pendingInvitations().length > 0">
        <li *ngFor="let inv of pendingInvitations()" class="collab-item collab-item--pending">
          <span class="collab-avatar collab-avatar--muted">{{ initials(inv.invitedUsername) }}</span>
          <div class="collab-info">
            <span class="collab-name">{{ inv.invitedUsername }}</span>
            <span class="collab-email">{{ inv.invitedUserEmail }}</span>
          </div>
          <span class="pending-badge">Pendiente</span>
        </li>
      </ul>

      <!-- Invitar -->
      <div class="invite-section">
        <button
          type="button"
          class="invite-toggle"
          (click)="toggleInvite()"
        >
          <mat-icon>{{ inviting() ? 'remove' : 'person_add' }}</mat-icon>
          {{ inviting() ? 'Cancelar' : 'Invitar colaborador' }}
        </button>

        <div class="invite-form" *ngIf="inviting()">
          <div class="invite-error" *ngIf="errorMessage()">{{ errorMessage() }}</div>

          <select
            class="field-select"
            [(ngModel)]="selectedUsername"
            [disabled]="loadingInvitees()"
          >
            <option value="">
              {{ loadingInvitees() ? 'Cargando...' : '-- Selecciona un usuario --' }}
            </option>
            <option *ngFor="let u of invitees()" [value]="u.username">
              {{ u.username }} · {{ u.email }}
            </option>
          </select>

          <div class="invitees-empty" *ngIf="!loadingInvitees() && invitees().length === 0">
            No hay usuarios disponibles para invitar.
          </div>

          <button
            mat-flat-button
            color="primary"
            class="invite-submit"
            [disabled]="!selectedUsername || sending()"
            (click)="sendInvite()"
          >
            {{ sending() ? 'Enviando...' : 'Enviar invitacion' }}
          </button>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .collab-panel {
      display: flex;
      flex-direction: column;
    }

    .panel-section-title {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-muted);
      padding: 0 16px 8px;
    }

    .panel-section-title--mt {
      margin-top: 16px;
    }

    .collab-empty {
      padding: 8px 16px;
      font-size: 0.82rem;
      color: var(--text-muted);
    }

    .collab-list {
      list-style: none;
      margin: 0;
      padding: 0 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .collab-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface);
    }

    .collab-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--accent-soft);
      color: var(--accent-strong);
      font-size: 0.76rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .collab-avatar--muted {
      background: var(--surface-3);
      color: var(--text-muted);
    }

    .collab-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
      gap: 1px;
    }

    .collab-name {
      font-size: 0.84rem;
      font-weight: 600;
      color: var(--text);
    }

    .collab-email {
      font-size: 0.74rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .pending-badge {
      margin-left: auto;
      font-size: 0.72rem;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 999px;
      background: rgba(180, 83, 9, 0.1);
      color: var(--warning);
      flex-shrink: 0;
    }

    .invite-section {
      padding: 14px 16px 0;
      border-top: 1px solid var(--border);
      margin-top: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .invite-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      padding: 7px 10px;
      border: 1px dashed var(--border-strong);
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--text-muted);
      font-size: 0.84rem;
      font-weight: 500;
      cursor: pointer;
      transition: color 120ms ease, border-color 120ms ease, background 120ms ease;
    }

    .invite-toggle:hover {
      color: var(--accent);
      border-color: var(--accent);
      background: var(--accent-soft);
    }

    .invite-toggle mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .invite-form {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .invite-error {
      padding: 7px 10px;
      background: var(--danger-soft);
      color: var(--danger);
      font-size: 0.82rem;
      border-radius: var(--radius-sm);
      border: 1px solid rgba(185,28,28,0.18);
    }

    .field-select {
      width: 100%;
      padding: 6px 10px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface);
      font-size: 0.84rem;
      color: var(--text);
      outline: none;
      transition: border-color 120ms ease;
    }

    .field-select:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-soft);
    }

    .invitees-empty {
      font-size: 0.82rem;
      color: var(--text-muted);
    }

    .invite-submit {
      width: 100%;
    }
  `]
})
export class CollaboratorsPanelComponent implements OnInit {
  @Input({ required: true }) workflowId!: string;
  @Input() collaborators: Collaborator[] = [];
  @Input() invitations: Invitation[] = [];

  @Output() readonly collaboratorAdded = new EventEmitter<void>();

  private readonly workflowApi = inject(WorkflowApiService);

  protected readonly inviting = signal(false);
  protected readonly loadingInvitees = signal(false);
  protected readonly sending = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly invitees = signal<Invitee[]>([]);

  protected selectedUsername = '';

  protected readonly pendingInvitations = () =>
    this.invitations.filter((i) => i.status === 'PENDING');

  ngOnInit(): void {}

  protected initials(username: string): string {
    const parts = username.trim().split(/[\s._-]+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  protected toggleInvite(): void {
    this.inviting.update((v) => !v);
    if (this.inviting()) {
      this.loadInvitees();
    } else {
      this.selectedUsername = '';
      this.errorMessage.set('');
    }
  }

  protected sendInvite(): void {
    if (!this.selectedUsername) return;

    this.sending.set(true);
    this.errorMessage.set('');

    this.workflowApi.inviteCollaborator(this.workflowId, { invitedUsername: this.selectedUsername }).subscribe({
      next: () => {
        this.sending.set(false);
        this.inviting.set(false);
        this.selectedUsername = '';
        this.collaboratorAdded.emit();
      },
      error: (error: HttpErrorResponse) => {
        const apiError = error.error as Partial<ApiError> | null;
        this.errorMessage.set(apiError?.message || 'No fue posible enviar la invitacion.');
        this.sending.set(false);
      }
    });
  }

  private loadInvitees(): void {
    this.loadingInvitees.set(true);

    this.workflowApi.getInvitees(this.workflowId).subscribe({
      next: (list) => {
        this.invitees.set(list);
        this.loadingInvitees.set(false);
      },
      error: () => {
        this.invitees.set([]);
        this.loadingInvitees.set(false);
      }
    });
  }
}
