import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, Inject, OnInit, computed, inject, signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { ApiError } from '../../../../core/models/api-error.model';
import { Collaborator, Invitee } from '../../models/collaborator.model';
import { Invitation } from '../../models/invitation.model';
import { WorkflowApiService } from '../../services/workflow-api.service';

export interface CollaboratorsDialogData {
  workflowId: string;
  workflowName: string;
  workflowCode: string;
}

@Component({
  selector: 'app-collaborators-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <div class="dialog-shell">

      <!-- Header -->
      <div class="dialog-header">
        <div class="dialog-header__text">
          <span class="dialog-header__title">Equipo</span>
          <span class="dialog-header__sub">{{ data.workflowCode }} · {{ data.workflowName }}</span>
        </div>
        <button type="button" class="close-btn" (click)="close()" aria-label="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Loading inicial -->
      <div class="dialog-loading" *ngIf="loading()">
        <mat-icon>hourglass_empty</mat-icon>
        <span>Cargando...</span>
      </div>

      <ng-container *ngIf="!loading()">

        <!-- INVITAR -->
        <section class="dialog-section">
          <div class="section-title">Invitar usuario</div>

          <div class="search-box">
            <mat-icon class="search-box__icon">search</mat-icon>
            <input
              type="search"
              class="search-box__input"
              placeholder="Buscar por usuario o email..."
              [(ngModel)]="searchTerm"
              aria-label="Buscar usuario"
            />
          </div>

          <div class="invitees-empty" *ngIf="filteredInvitees().length === 0 && !searchTerm">
            No hay usuarios disponibles para invitar.
          </div>
          <div class="invitees-empty" *ngIf="filteredInvitees().length === 0 && searchTerm">
            Sin resultados para "{{ searchTerm }}".
          </div>

          <ul class="invitees-list" *ngIf="filteredInvitees().length > 0">
            <li *ngFor="let u of filteredInvitees()" class="invitee-item">
              <span class="user-avatar user-avatar--sm">{{ initials(u.username) }}</span>
              <div class="user-info">
                <span class="user-name">{{ u.username }}</span>
                <span class="user-email">{{ u.email }}</span>
              </div>
              <button
                mat-stroked-button
                class="invite-btn"
                [disabled]="inviting() === u.username"
                (click)="invite(u)"
              >
                <mat-icon>person_add</mat-icon>
                {{ inviting() === u.username ? 'Enviando...' : 'Invitar' }}
              </button>
            </li>
          </ul>

          <div class="invite-error" *ngIf="inviteError()">{{ inviteError() }}</div>
        </section>

        <!-- COLABORADORES -->
        <section class="dialog-section" *ngIf="collaborators().length > 0">
          <div class="section-title">Colaboradores ({{ collaborators().length }})</div>
          <ul class="members-list">
            <li *ngFor="let c of collaborators()" class="member-item">
              <span class="user-avatar">{{ initials(c.username) }}</span>
              <div class="user-info">
                <span class="user-name">{{ c.username }}</span>
                <span class="user-email">{{ c.email }}</span>
              </div>
              <span class="status-chip status-chip--active">Activo</span>
            </li>
          </ul>
        </section>

        <!-- PENDIENTES -->
        <section class="dialog-section" *ngIf="pendingInvitations().length > 0">
          <div class="section-title">Pendientes ({{ pendingInvitations().length }})</div>
          <ul class="members-list">
            <li *ngFor="let inv of pendingInvitations()" class="member-item">
              <span class="user-avatar user-avatar--muted">{{ initials(inv.invitedUsername) }}</span>
              <div class="user-info">
                <span class="user-name">{{ inv.invitedUsername }}</span>
                <span class="user-email">{{ inv.invitedUserEmail }}</span>
              </div>
              <span class="status-chip status-chip--pending">Pendiente</span>
            </li>
          </ul>
        </section>

      </ng-container>
    </div>
  `,
  styles: [`
    .dialog-shell {
      width: 480px;
      max-width: 100%;
      display: flex;
      flex-direction: column;
    }

    /* Header */
    .dialog-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 20px 20px 16px;
      border-bottom: 1px solid var(--border);
    }

    .dialog-header__title {
      display: block;
      font-size: 1rem;
      font-weight: 700;
      color: var(--text);
      line-height: 1.2;
    }

    .dialog-header__sub {
      display: block;
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .close-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      flex-shrink: 0;
      border: 0;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      transition: background 120ms ease, color 120ms ease;
    }

    .close-btn:hover {
      background: var(--surface-hover);
      color: var(--text);
    }

    .close-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    /* Loading */
    .dialog-loading {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 28px 20px;
      color: var(--text-muted);
      font-size: 0.86rem;
    }

    .dialog-loading mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    /* Sections */
    .dialog-section {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
    }

    .dialog-section:last-child {
      border-bottom: 0;
    }

    .section-title {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 10px;
    }

    /* Search */
    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 10px;
      height: 38px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      transition: border-color 120ms ease, box-shadow 120ms ease;
      margin-bottom: 10px;
    }

    .search-box:focus-within {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-soft);
    }

    .search-box__icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .search-box__input {
      flex: 1;
      border: 0;
      outline: 0;
      background: transparent;
      font-size: 0.86rem;
      color: var(--text);
    }

    .search-box__input::placeholder {
      color: var(--text-subtle);
    }

    .search-box__input::-webkit-search-cancel-button {
      display: none;
    }

    /* Invitees */
    .invitees-empty {
      font-size: 0.82rem;
      color: var(--text-muted);
      padding: 4px 0;
    }

    .invitees-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 180px;
      overflow-y: auto;
    }

    .invitee-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 7px 10px;
      border-radius: var(--radius-sm);
      transition: background 120ms ease;
    }

    .invitee-item:hover {
      background: var(--surface-2);
    }

    .invite-btn {
      margin-left: auto;
      flex-shrink: 0;
      height: 30px;
      font-size: 0.78rem;
      padding: 0 10px;
    }

    .invite-btn mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      margin-right: 4px;
    }

    .invite-error {
      margin-top: 8px;
      padding: 7px 10px;
      background: var(--danger-soft);
      color: var(--danger);
      font-size: 0.82rem;
      border-radius: var(--radius-sm);
      border: 1px solid rgba(185,28,28,0.18);
    }

    /* Members */
    .members-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .member-item {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* Avatars */
    .user-avatar {
      width: 34px;
      height: 34px;
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

    .user-avatar--sm {
      width: 30px;
      height: 30px;
      font-size: 0.72rem;
    }

    .user-avatar--muted {
      background: var(--surface-3);
      color: var(--text-muted);
    }

    .user-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
      gap: 1px;
    }

    .user-name {
      font-size: 0.86rem;
      font-weight: 600;
      color: var(--text);
    }

    .user-email {
      font-size: 0.76rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 220px;
    }

    /* Status chips */
    .status-chip {
      margin-left: auto;
      flex-shrink: 0;
      font-size: 0.72rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 999px;
    }

    .status-chip--active {
      background: var(--accent-soft);
      color: var(--accent-strong);
    }

    .status-chip--pending {
      background: rgba(180, 83, 9, 0.1);
      color: var(--warning);
    }
  `]
})
export class CollaboratorsDialogComponent implements OnInit {
  private readonly workflowApi = inject(WorkflowApiService);
  private readonly dialogRef = inject(MatDialogRef<CollaboratorsDialogComponent>);

  protected readonly loading = signal(true);
  protected readonly inviting = signal('');
  protected readonly inviteError = signal('');
  protected readonly collaborators = signal<Collaborator[]>([]);
  protected readonly invitations = signal<Invitation[]>([]);
  protected readonly invitees = signal<Invitee[]>([]);

  protected searchTerm = '';

  protected readonly pendingInvitations = computed(() =>
    this.invitations().filter((i) => i.status === 'PENDING')
  );

  protected readonly filteredInvitees = computed(() => {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.invitees();
    return this.invitees().filter((u) =>
      u.username.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
    );
  });

  constructor(@Inject(MAT_DIALOG_DATA) protected readonly data: CollaboratorsDialogData) {}

  ngOnInit(): void {
    this.loadAll();
  }

  protected initials(username: string): string {
    const parts = username.trim().split(/[\s._-]+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  protected invite(user: Invitee): void {
    this.inviting.set(user.username);
    this.inviteError.set('');

    this.workflowApi.inviteCollaborator(this.data.workflowId, { invitedUsername: user.username }).subscribe({
      next: (invitation) => {
        this.invitations.update((list) => [...list, invitation]);
        this.invitees.update((list) => list.filter((u) => u.username !== user.username));
        this.inviting.set('');
      },
      error: (error: HttpErrorResponse) => {
        const apiError = error.error as Partial<ApiError> | null;
        this.inviteError.set(apiError?.message || 'No fue posible enviar la invitacion.');
        this.inviting.set('');
      }
    });
  }

  protected close(): void {
    this.dialogRef.close();
  }

  private loadAll(): void {
    this.loading.set(true);

    let pending = 3;
    const done = () => { if (--pending === 0) this.loading.set(false); };

    this.workflowApi.getCollaborators(this.data.workflowId).subscribe({
      next: (list) => { this.collaborators.set(list); done(); },
      error: () => done()
    });

    this.workflowApi.getInvitations(this.data.workflowId).subscribe({
      next: (list) => { this.invitations.set(list); done(); },
      error: () => done()
    });

    this.workflowApi.getInvitees(this.data.workflowId).subscribe({
      next: (list) => { this.invitees.set(list); done(); },
      error: () => done()
    });
  }
}
