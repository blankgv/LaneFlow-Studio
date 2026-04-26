import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';

import { ApiError } from '../../../core/models/api-error.model';
import { AuthSessionService } from '../../auth/services/auth-session.service';
import { AdminPageHeaderComponent } from '../../admin/components/admin-page-header/admin-page-header.component';
import { AdminSearchBarComponent } from '../../admin/components/admin-search-bar/admin-search-bar.component';
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
  `]
})
export class PolicyListPageComponent {
  private readonly workflowApi = inject(WorkflowApiService);
  private readonly authSession = inject(AuthSessionService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly policies = signal<WorkflowSummary[]>([]);
  protected readonly searchTerm = signal('');
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
}
