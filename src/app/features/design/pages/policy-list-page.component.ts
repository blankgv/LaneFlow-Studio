import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';

import { ApiError } from '../../../core/models/api-error.model';
import { AuthSessionService } from '../../auth/services/auth-session.service';
import { AdminPageHeaderComponent } from '../../admin/components/admin-page-header/admin-page-header.component';
import { AdminSearchBarComponent } from '../../admin/components/admin-search-bar/admin-search-bar.component';
import { CollaboratorsDialogComponent } from '../components/collaborators-dialog/collaborators-dialog.component';
import { Invitation } from '../models/invitation.model';
import { WorkflowSummary } from '../models/workflow-summary.model';
import { WorkflowStatus } from '../models/workflow.model';
import { WorkflowApiService } from '../services/workflow-api.service';

@Component({
  selector: 'app-policy-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatTableModule,
    AdminPageHeaderComponent,
    AdminSearchBarComponent
  ],
  template: `
    <section class="admin-page">
      <app-admin-page-header
        title="Politicas"
        description="Diseña y gestiona los flujos de aprobacion de tu organizacion."
      />

      <div class="admin-page__alert" *ngIf="errorMessage()">{{ errorMessage() }}</div>

      <!-- Banner invitaciones pendientes -->
      <div class="invitations-banner" *ngIf="pendingInvitations().length > 0">
        <div class="invitations-banner__header">
          <mat-icon>mail</mat-icon>
          <span>Tienes <strong>{{ pendingInvitations().length }}</strong> invitacion{{ pendingInvitations().length > 1 ? 'es' : '' }} pendiente{{ pendingInvitations().length > 1 ? 's' : '' }} para colaborar en politicas.</span>
        </div>
        <ul class="invitations-banner__list">
          <li *ngFor="let inv of pendingInvitations()" class="inv-row">
            <span class="inv-row__name">{{ inv.workflowName || inv.workflowDefinitionId }}</span>
            <span class="inv-row__by">por <strong>{{ inv.invitedByUsername }}</strong></span>
            <div class="inv-row__actions">
              <button mat-stroked-button class="btn-reject" [disabled]="responding() === inv.id" (click)="respond(inv, 'reject')">Rechazar</button>
              <button mat-flat-button color="primary" [disabled]="responding() === inv.id" (click)="respond(inv, 'accept')">
                {{ responding() === inv.id ? '...' : 'Aceptar' }}
              </button>
            </div>
          </li>
        </ul>
      </div>

      <div class="admin-page__toolbar">
        <app-admin-search-bar
          label="Buscar politica"
          placeholder="Codigo, nombre o descripcion"
          [value]="searchTerm()"
          (valueChange)="searchTerm.set($event)"
        />

        <a *ngIf="canWrite" mat-flat-button color="primary" [routerLink]="['/design/new']">
          <mat-icon>add</mat-icon>
          Nueva politica
        </a>
      </div>

      <div class="data-table">
        <div class="data-table__wrap">
          <table mat-table [dataSource]="filteredPolicies()">

            <ng-container matColumnDef="code">
              <th mat-header-cell *matHeaderCellDef>Codigo</th>
              <td mat-cell *matCellDef="let item">
                <span class="policy-code">{{ item.code }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Nombre</th>
              <td mat-cell *matCellDef="let item">
                <div class="stack-cell">
                  <strong>{{ item.name }}</strong>
                  <span *ngIf="item.description">{{ item.description }}</span>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let item">
                <span class="status-badge" [ngClass]="statusClass(item.status)">
                  {{ statusLabel(item.status) }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="version">
              <th mat-header-cell *matHeaderCellDef>Version</th>
              <td mat-cell *matCellDef="let item">
                <span class="version-cell">v{{ item.currentVersion }}</span>
                <span class="version-published" *ngIf="item.publishedVersionNumber !== null">
                  &nbsp;(pub. v{{ item.publishedVersionNumber }})
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="updatedAt">
              <th mat-header-cell *matHeaderCellDef>Modificado</th>
              <td mat-cell *matCellDef="let item">
                <span class="date-cell">{{ item.updatedAt | date:'dd/MM/yyyy' }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="data-table__actions"></th>
              <td mat-cell *matCellDef="let item" class="data-table__actions">
                <button mat-icon-button (click)="openCollaborators(item)" aria-label="Gestionar equipo">
                  <mat-icon>group</mat-icon>
                </button>
                <a mat-icon-button [routerLink]="['/design', item.id, 'editor']" aria-label="Abrir editor">
                  <mat-icon>edit</mat-icon>
                </a>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

            <tr class="mat-row" *matNoDataRow>
              <td [attr.colspan]="displayedColumns.length">
                <div class="data-table__state" *ngIf="!loading(); else loadingTpl">
                  <mat-icon>policy</mat-icon>
                  <strong>Sin politicas</strong>
                  <span *ngIf="searchTerm(); else emptyHint">
                    Ningun resultado para "{{ searchTerm() }}"
                  </span>
                  <ng-template #emptyHint>
                    <span>Crea la primera politica para comenzar.</span>
                  </ng-template>
                </div>
                <ng-template #loadingTpl>
                  <div class="data-table__state">
                    <mat-icon>hourglass_empty</mat-icon>
                    <span>Cargando politicas...</span>
                  </div>
                </ng-template>
              </td>
            </tr>
          </table>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .policy-code {
      font-family: monospace;
      font-size: 0.82rem;
      color: var(--text-muted);
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-xs);
      padding: 2px 6px;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      padding: 2px 8px;
      border-radius: 999px;
      text-transform: uppercase;
    }

    .status-badge--draft {
      background: rgba(180, 83, 9, 0.1);
      color: var(--warning);
    }

    .status-badge--published {
      background: var(--accent-soft);
      color: var(--accent-strong);
    }

    .status-badge--archived {
      background: var(--surface-3);
      color: var(--text-muted);
    }

    .version-cell {
      font-size: 0.86rem;
      font-weight: 600;
      color: var(--text);
    }

    .version-published {
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .date-cell {
      font-size: 0.82rem;
      color: var(--text-muted);
    }

    /* Banner invitaciones */
    .invitations-banner {
      margin: 0 0 16px;
      border: 1px solid var(--accent);
      border-radius: var(--radius);
      background: var(--accent-soft);
      overflow: hidden;
    }

    .invitations-banner__header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border-bottom: 1px solid rgba(0,0,0,0.06);
      font-size: 0.86rem;
      color: var(--text);
    }

    .invitations-banner__header mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--accent-strong);
      flex-shrink: 0;
    }

    .invitations-banner__list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .inv-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      border-bottom: 1px solid rgba(0,0,0,0.06);
      background: var(--surface);
    }

    .inv-row:last-child {
      border-bottom: 0;
    }

    .inv-row__name {
      font-size: 0.86rem;
      font-weight: 600;
      color: var(--text);
      flex: 1;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .inv-row__by {
      font-size: 0.78rem;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .inv-row__actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }

    .btn-reject {
      font-size: 0.82rem;
    }
  `]
})
export class PolicyListPageComponent implements OnInit {
  private readonly workflowApi = inject(WorkflowApiService);
  private readonly authSession = inject(AuthSessionService);
  private readonly dialog = inject(MatDialog);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly policies = signal<WorkflowSummary[]>([]);
  protected readonly searchTerm = signal('');
  protected readonly pendingInvitations = signal<(Invitation & { workflowName?: string })[]>([]);
  protected readonly responding = signal('');
  protected readonly canWrite = this.authSession.hasPermission('WORKFLOW_WRITE');
  protected readonly displayedColumns = ['code', 'name', 'status', 'version', 'updatedAt', 'actions'];

  protected readonly filteredPolicies = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();

    if (!term) {
      return this.policies();
    }

    return this.policies().filter((item) =>
      [item.code, item.name, item.description ?? ''].some((value) =>
        value.toLowerCase().includes(term)
      )
    );
  });

  constructor() {
    this.loadPolicies();
  }

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
        if (action === 'accept') this.loadPolicies();
      },
      error: () => this.responding.set('')
    });
  }

  protected openCollaborators(item: WorkflowSummary): void {
    this.dialog.open(CollaboratorsDialogComponent, {
      data: { workflowId: item.id, workflowName: item.name, workflowCode: item.code },
      panelClass: 'collab-dialog-panel'
    });
  }

  protected statusLabel(status: WorkflowStatus): string {
    const labels: Record<WorkflowStatus, string> = {
      DRAFT: 'Borrador',
      PUBLISHED: 'Publicada',
      ARCHIVED: 'Archivada'
    };
    return labels[status] ?? status;
  }

  protected statusClass(status: WorkflowStatus): string {
    const classes: Record<WorkflowStatus, string> = {
      DRAFT: 'status-badge--draft',
      PUBLISHED: 'status-badge--published',
      ARCHIVED: 'status-badge--archived'
    };
    return classes[status] ?? '';
  }

  private loadPolicies(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.workflowApi.getWorkflows().subscribe({
      next: (response) => {
        this.policies.set(response);
      },
      error: (error: HttpErrorResponse) => {
        const apiError = error.error as Partial<ApiError> | null;
        this.errorMessage.set(apiError?.message || 'No fue posible cargar las politicas.');
        this.loading.set(false);
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }

  private loadInvitations(): void {
    this.workflowApi.getMyInvitations().subscribe({
      next: (list) => {
        this.pendingInvitations.set(
          list.filter((i) => i.status === 'PENDING').map((i) => ({
            ...i,
            workflowName: (i as any).workflowName ?? undefined
          }))
        );
      },
      error: () => {}
    });
  }
}
