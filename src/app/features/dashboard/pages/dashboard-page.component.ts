import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { Invitation } from '../../design/models/invitation.model';
import { WorkflowApiService } from '../../design/services/workflow-api.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="dashboard-page">

      <!-- Invitaciones pendientes -->
      <section class="invitations-card" *ngIf="!loadingInvitations() && pendingInvitations().length > 0">
        <div class="invitations-card__header">
          <mat-icon>mail</mat-icon>
          <span class="invitations-card__title">Invitaciones pendientes</span>
          <span class="invitations-card__count">{{ pendingInvitations().length }}</span>
        </div>

        <ul class="invitations-list">
          <li *ngFor="let inv of pendingInvitations()" class="invitation-item">
            <div class="invitation-item__info">
              <span class="invitation-item__name">{{ inv.workflowName }}</span>
              <span class="invitation-item__meta">
                Invitado por <strong>{{ inv.invitedByUsername }}</strong>
              </span>
            </div>
            <div class="invitation-item__actions">
              <button
                mat-stroked-button
                class="btn-reject"
                [disabled]="responding() === inv.id"
                (click)="respond(inv, 'reject')"
              >
                Rechazar
              </button>
              <button
                mat-flat-button
                color="primary"
                [disabled]="responding() === inv.id"
                (click)="respond(inv, 'accept')"
              >
                {{ responding() === inv.id ? '...' : 'Aceptar' }}
              </button>
            </div>
          </li>
        </ul>
      </section>

      <!-- Estado vacío / construcción -->
      <div class="dashboard-empty" [class.dashboard-empty--compact]="pendingInvitations().length > 0">
        <mat-icon>construction</mat-icon>
        <h1>Dashboard</h1>
        <p>Esta seccion esta en construccion.</p>
      </div>

    </div>
  `,
  styles: [`
    .dashboard-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      padding: 32px 24px;
      min-height: 100%;
    }

    /* Card de invitaciones */
    .invitations-card {
      width: 100%;
      max-width: 640px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      overflow: hidden;
    }

    .invitations-card__header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 20px;
      border-bottom: 1px solid var(--border);
      background: var(--surface-2);
    }

    .invitations-card__header mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--accent);
    }

    .invitations-card__title {
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--text);
      flex: 1;
    }

    .invitations-card__count {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 1px 7px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent-strong);
    }

    /* Lista */
    .invitations-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .invitation-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 20px;
      border-bottom: 1px solid var(--border);
    }

    .invitation-item:last-child {
      border-bottom: 0;
    }

    .invitation-item__info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .invitation-item__name {
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .invitation-item__meta {
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .invitation-item__actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .btn-reject {
      font-size: 0.82rem;
    }

    /* Dashboard vacío */
    .dashboard-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      text-align: center;
      color: var(--text-muted);
      flex: 1;
      justify-content: center;
    }

    .dashboard-empty mat-icon {
      width: 40px;
      height: 40px;
      font-size: 40px;
      color: var(--text-subtle);
    }

    h1 {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 600;
      color: var(--text);
    }

    p {
      margin: 0;
      font-size: 0.86rem;
    }
  `]
})
export class DashboardPageComponent implements OnInit {
  private readonly workflowApi = inject(WorkflowApiService);

  protected readonly loadingInvitations = signal(true);
  protected readonly responding = signal('');
  protected readonly pendingInvitations = signal<(Invitation & { workflowName: string })[]>([]);

  ngOnInit(): void {
    this.loadInvitations();
  }

  protected respond(inv: Invitation, action: 'accept' | 'reject'): void {
    this.responding.set(inv.id);

    const call = action === 'accept'
      ? this.workflowApi.acceptInvitation(inv.id)
      : this.workflowApi.rejectInvitation(inv.id);

    call.subscribe({
      next: () => {
        this.pendingInvitations.update((list) => list.filter((i) => i.id !== inv.id));
        this.responding.set('');
      },
      error: () => this.responding.set('')
    });
  }

  private loadInvitations(): void {
    this.workflowApi.getMyInvitations().subscribe({
      next: (list) => {
        const pending = list
          .filter((i) => i.status === 'PENDING')
          .map((i) => ({ ...i, workflowName: (i as any).workflowName ?? i.workflowDefinitionId }));
        this.pendingInvitations.set(pending);
        this.loadingInvitations.set(false);
      },
      error: () => this.loadingInvitations.set(false)
    });
  }
}
