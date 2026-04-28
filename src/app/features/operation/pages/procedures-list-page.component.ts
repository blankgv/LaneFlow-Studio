import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';

import { ProcedureInstance, ProcedureStatus } from '../models/procedure.model';
import { ProceduresApiService } from '../services/procedures-api.service';

@Component({
  selector: 'app-procedures-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, MatIconModule, MatTableModule],
  template: `
    <section class="page">

      <header class="page-header">
        <div class="page-header__text">
          <h1>Tramites</h1>
          <p>Consulta y gestiona los tramites iniciados en el sistema.</p>
        </div>
        <a mat-flat-button color="primary" routerLink="/operation/start">
          <mat-icon>add</mat-icon>
          Nuevo tramite
        </a>
      </header>

      <!-- Toolbar -->
      <div class="toolbar" *ngIf="!loading() && !error()">
        <label class="search-bar">
          <mat-icon class="search-bar__icon">search</mat-icon>
          <input
            class="search-bar__input"
            type="search"
            placeholder="Buscar por código, política o solicitante"
            [ngModel]="searchTerm()"
            (ngModelChange)="searchTerm.set($event)"
          />
          <button *ngIf="searchTerm()" type="button" class="search-bar__clear" (click)="searchTerm.set('')">
            <mat-icon>close</mat-icon>
          </button>
        </label>
        <button mat-stroked-button type="button" (click)="reload()">
          <mat-icon>refresh</mat-icon>
          Actualizar
        </button>
      </div>

      <!-- Loading -->
      <div class="state" *ngIf="loading()">
        <mat-icon>hourglass_empty</mat-icon>
        <span>Cargando tramites...</span>
      </div>

      <!-- Error -->
      <div class="state state--error" *ngIf="!loading() && error()">
        <mat-icon>error_outline</mat-icon>
        <strong>No se pudieron cargar los tramites</strong>
        <span>{{ error() }}</span>
        <button mat-stroked-button type="button" (click)="reload()">Reintentar</button>
      </div>

      <!-- Empty -->
      <div class="state" *ngIf="!loading() && !error() && procedures().length === 0">
        <mat-icon>folder_open</mat-icon>
        <strong>No hay tramites iniciados</strong>
        <span>Crea el primer tramite desde una politica publicada.</span>
        <a mat-stroked-button routerLink="/operation/start">Nuevo tramite</a>
      </div>

      <!-- No results from search -->
      <div class="state" *ngIf="!loading() && !error() && procedures().length > 0 && filtered().length === 0">
        <mat-icon>search_off</mat-icon>
        <strong>Sin resultados</strong>
        <span>Ningún tramite coincide con "{{ searchTerm() }}".</span>
      </div>

      <!-- Table -->
      <div class="table-wrap" *ngIf="!loading() && !error() && filtered().length > 0">
        <table mat-table [dataSource]="filtered()" class="procedures-table">

          <ng-container matColumnDef="code">
            <th mat-header-cell *matHeaderCellDef>Código</th>
            <td mat-cell *matCellDef="let row">
              <strong class="code-cell">{{ row.code }}</strong>
            </td>
          </ng-container>

          <ng-container matColumnDef="workflow">
            <th mat-header-cell *matHeaderCellDef>Política</th>
            <td mat-cell *matCellDef="let row">{{ row.workflowName }}</td>
          </ng-container>

          <ng-container matColumnDef="applicant">
            <th mat-header-cell *matHeaderCellDef>Solicitante</th>
            <td mat-cell *matCellDef="let row">{{ row.applicantName }}</td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let row">
              <span class="status-chip" [class]="statusClass(row.status)">
                {{ statusLabel(row.status) }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="stage">
            <th mat-header-cell *matHeaderCellDef>Etapa</th>
            <td mat-cell *matCellDef="let row">
              <span class="muted">{{ row.currentNodeName || '—' }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>Fecha</th>
            <td mat-cell *matCellDef="let row">
              <span class="muted">{{ (row.startedAt || row.createdAt) | date:'dd/MM/yyyy' }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let row">
              <a mat-icon-button [routerLink]="['/operation/procedures', row.id]" title="Ver detalle">
                <mat-icon>open_in_new</mat-icon>
              </a>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
        </table>
      </div>

    </section>
  `,
  styles: [`
    .page {
      padding: 28px 32px;
      max-width: 1100px;
    }

    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 20px;
    }

    .page-header h1 {
      margin: 0;
      font-size: 1.35rem;
      color: var(--text);
    }

    .page-header p {
      margin: 4px 0 0;
      color: var(--text-muted);
      font-size: 0.86rem;
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
    }

    .search-bar {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface);
      height: 38px;
    }

    .search-bar__icon {
      color: var(--text-muted);
      font-size: 18px;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    .search-bar__input {
      flex: 1;
      border: none;
      background: transparent;
      color: var(--text);
      font-size: 0.87rem;
      outline: none;
    }

    .search-bar__clear {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      padding: 0;
    }

    .search-bar__clear mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 56px 0;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.86rem;
    }

    .state mat-icon {
      color: var(--text-subtle);
      width: 34px;
      height: 34px;
      font-size: 34px;
    }

    .state strong {
      color: var(--text);
      font-size: 0.96rem;
    }

    .state--error, .state--error mat-icon { color: var(--danger); }

    .table-wrap {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      background: var(--surface);
    }

    .procedures-table {
      width: 100%;
    }

    .code-cell {
      font-size: 0.87rem;
      color: var(--text);
    }

    .muted {
      color: var(--text-muted);
      font-size: 0.84rem;
    }

    .status-chip {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 2px 9px;
      font-size: 0.7rem;
      font-weight: 700;
      background: var(--surface-2);
      color: var(--text-muted);
      white-space: nowrap;
    }

    .status-chip--active {
      background: var(--accent-soft);
      color: var(--accent-strong);
    }

    .status-chip--observed {
      background: rgba(180, 83, 9, 0.08);
      color: var(--warning);
    }

    .status-chip--done {
      background: rgba(22, 101, 52, 0.1);
      color: #166534;
    }

    .status-chip--rejected {
      background: var(--danger-soft);
      color: var(--danger);
    }
  `]
})
export class ProceduresListPageComponent implements OnInit {
  private readonly proceduresApi = inject(ProceduresApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly procedures = signal<ProcedureInstance[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly searchTerm = signal('');

  protected readonly columns = ['code', 'workflow', 'applicant', 'status', 'stage', 'date', 'actions'];

  protected readonly filtered = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.procedures();
    return this.procedures().filter((p) =>
      p.code?.toLowerCase().includes(term) ||
      p.workflowName?.toLowerCase().includes(term) ||
      p.applicantName?.toLowerCase().includes(term)
    );
  });

  ngOnInit(): void {
    this.loadProcedures();
  }

  protected reload(): void {
    this.loadProcedures();
  }

  protected statusLabel(status: ProcedureStatus): string {
    const labels: Record<ProcedureStatus, string> = {
      STARTED: 'Iniciado',
      IN_PROGRESS: 'En curso',
      OBSERVED: 'Observado',
      REJECTED: 'Rechazado',
      COMPLETED: 'Completado',
      CANCELLED: 'Cancelado'
    };
    return labels[status] ?? status;
  }

  protected statusClass(status: ProcedureStatus): string {
    if (status === 'STARTED' || status === 'IN_PROGRESS') return 'status-chip status-chip--active';
    if (status === 'OBSERVED') return 'status-chip status-chip--observed';
    if (status === 'COMPLETED') return 'status-chip status-chip--done';
    if (status === 'REJECTED' || status === 'CANCELLED') return 'status-chip status-chip--rejected';
    return 'status-chip';
  }

  private loadProcedures(): void {
    this.loading.set(true);
    this.error.set('');

    this.proceduresApi.getProcedures().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (procedures) => {
        this.procedures.set(procedures);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message || 'No fue posible cargar los tramites.');
        this.loading.set(false);
      }
    });
  }
}
