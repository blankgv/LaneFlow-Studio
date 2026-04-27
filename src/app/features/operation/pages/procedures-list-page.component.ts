import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ProcedureInstance, ProcedureStatus } from '../models/procedure.model';
import { ProceduresApiService } from '../services/procedures-api.service';

@Component({
  selector: 'app-procedures-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <section class="procedures-page">
      <header class="page-header">
        <div>
          <h1>Tramites</h1>
          <p>Consulta los tramites iniciados, su estado y etapa actual.</p>
        </div>
        <div class="header-actions">
          <a mat-flat-button color="primary" routerLink="/operation/start">
            <mat-icon>play_arrow</mat-icon>
            Iniciar tramite
          </a>
          <button mat-stroked-button type="button" (click)="reload()">
            <mat-icon>refresh</mat-icon>
            Actualizar
          </button>
        </div>
      </header>

      <div class="state" *ngIf="loading()">
        <mat-icon>hourglass_empty</mat-icon>
        <span>Cargando tramites...</span>
      </div>

      <div class="state state--error" *ngIf="!loading() && error()">
        <mat-icon>error_outline</mat-icon>
        <strong>No se pudieron cargar los tramites</strong>
        <span>{{ error() }}</span>
        <button mat-stroked-button type="button" (click)="reload()">Reintentar</button>
      </div>

      <div class="state" *ngIf="!loading() && !error() && procedures().length === 0">
        <mat-icon>folder_open</mat-icon>
        <strong>No hay tramites iniciados</strong>
        <span>Inicia un tramite desde una politica publicada para verlo aqui.</span>
        <a mat-stroked-button routerLink="/operation/start">Iniciar tramite</a>
      </div>

      <div class="procedures-list" *ngIf="!loading() && !error() && procedures().length > 0">
        <article class="procedure-card" *ngFor="let procedure of procedures()">
          <div class="procedure-card__main">
            <div class="procedure-card__title">
              <strong>{{ procedure.code }}</strong>
              <span class="status-chip" [class]="statusClass(procedure.status)">
                {{ statusLabel(procedure.status) }}
              </span>
            </div>
            <span class="procedure-card__workflow">{{ procedure.workflowName }}</span>
            <div class="procedure-card__meta">
              <span>
                <mat-icon>person</mat-icon>
                {{ procedure.applicantName }}
              </span>
              <span *ngIf="procedure.currentNodeName">
                <mat-icon>near_me</mat-icon>
                {{ procedure.currentNodeName }}
              </span>
              <span *ngIf="procedure.currentAssigneeUsername">
                <mat-icon>account_circle</mat-icon>
                {{ procedure.currentAssigneeUsername }}
              </span>
              <span>
                <mat-icon>schedule</mat-icon>
                {{ (procedure.startedAt || procedure.createdAt) | date:'dd/MM/yyyy HH:mm' }}
              </span>
            </div>
          </div>
          <a mat-stroked-button [routerLink]="['/operation/procedures', procedure.id]">
            <mat-icon>open_in_new</mat-icon>
            Ver detalle
          </a>
        </article>
      </div>
    </section>
  `,
  styles: [`
    .procedures-page {
      max-width: 1060px;
      padding: 28px 32px;
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 22px;
    }

    .page-header h1 {
      margin: 0;
      color: var(--text);
      font-size: 1.35rem;
    }

    .page-header p {
      margin: 4px 0 0;
      color: var(--text-muted);
      font-size: 0.86rem;
    }

    .header-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
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

    .state--error,
    .state--error mat-icon {
      color: var(--danger);
    }

    .procedures-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .procedure-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 18px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      box-shadow: var(--shadow-sm);
    }

    .procedure-card__main {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 7px;
    }

    .procedure-card__title {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .procedure-card__title strong {
      color: var(--text);
      font-size: 0.96rem;
    }

    .procedure-card__workflow {
      color: var(--text-muted);
      font-size: 0.8rem;
    }

    .procedure-card__meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .procedure-card__meta span {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 999px;
      background: var(--surface-2);
      color: var(--text-muted);
      font-size: 0.72rem;
    }

    .procedure-card__meta mat-icon {
      width: 13px;
      height: 13px;
      font-size: 13px;
    }

    .status-chip {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 0.7rem;
      font-weight: 700;
      background: var(--surface-2);
      color: var(--text-muted);
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
