import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { WorkflowSummary } from '../../design/models/workflow-summary.model';
import { WorkflowApiService } from '../../design/services/workflow-api.service';
import { Applicant } from '../models/applicant.model';
import { ApplicantsApiService } from '../services/applicants-api.service';
import { ProceduresApiService } from '../services/procedures-api.service';

@Component({
  selector: 'app-procedure-start-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, RouterLink],
  template: `
    <section class="start-page">
      <header class="page-header">
        <div>
          <h1>Nuevo tramite</h1>
          <p>Selecciona una politica publicada y un solicitante para iniciar el tramite.</p>
        </div>
        <a mat-stroked-button routerLink="/operation/procedures">
          <mat-icon>arrow_back</mat-icon>
          Volver
        </a>
      </header>

      <div class="alert alert--error" *ngIf="error()">
        <mat-icon>error_outline</mat-icon>
        {{ error() }}
      </div>

      <div class="start-grid">
        <form class="panel" (ngSubmit)="start()">

          <div class="empty-notice" *ngIf="publishedWorkflows().length === 0">
            <mat-icon>policy</mat-icon>
            <span>No hay politicas publicadas. Publica una politica antes de crear un tramite.</span>
          </div>

          <div class="empty-notice" *ngIf="applicants().length === 0">
            <mat-icon>person_search</mat-icon>
            <span>No hay solicitantes activos.</span>
            <a mat-stroked-button routerLink="/operation/applicants">Gestionar solicitantes</a>
          </div>

          <label class="field">
            <span class="field__label">Politica <b>*</b></span>
            <select [(ngModel)]="selectedWorkflowId" name="workflow" required>
              <option value="">Selecciona una politica</option>
              <option *ngFor="let w of publishedWorkflows()" [value]="w.id">
                {{ w.code }} — {{ w.name }}
              </option>
            </select>
          </label>

          <label class="field">
            <span class="field__label">Solicitante <b>*</b></span>
            <select [(ngModel)]="selectedApplicantId" name="applicant" required>
              <option value="">Selecciona un solicitante</option>
              <option *ngFor="let a of applicants()" [value]="a.id">
                {{ applicantLabel(a) }}
              </option>
            </select>
          </label>

          <div class="actions">
            <button
              mat-flat-button
              color="primary"
              type="submit"
              [disabled]="starting() || !selectedWorkflowId || !selectedApplicantId"
            >
              <mat-icon>play_arrow</mat-icon>
              {{ starting() ? 'Iniciando...' : 'Iniciar tramite' }}
            </button>
          </div>
        </form>

        <aside class="panel panel--info">
          <mat-icon class="info-icon">info_outline</mat-icon>
          <p>Las tareas, formularios y flujo del tramite estan definidos en la politica seleccionada.</p>
          <p>Podras adjuntar evidencias y documentos desde el detalle del tramite una vez creado.</p>
          <a mat-stroked-button routerLink="/operation/applicants">
            <mat-icon>people</mat-icon>
            Gestionar solicitantes
          </a>
        </aside>
      </div>
    </section>
  `,
  styles: [`
    .start-page {
      padding: 28px 32px;
      max-width: 860px;
    }

    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 24px;
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

    .start-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 280px;
      gap: 16px;
      align-items: start;
    }

    .panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .panel--info {
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: var(--surface-raised, #f8f9fa);
    }

    .info-icon {
      color: var(--accent);
    }

    .panel--info p {
      margin: 0;
      font-size: 0.83rem;
      color: var(--text-muted);
      line-height: 1.55;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .field__label {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text);
    }

    .field select {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface-2);
      color: var(--text);
      padding: 9px 12px;
      font: inherit;
    }

    .empty-notice {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      color: var(--text-muted);
      background: var(--surface-2);
      border-radius: var(--radius-sm);
      font-size: 0.84rem;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      padding-top: 4px;
      border-top: 1px solid var(--border);
    }

    .alert {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-radius: var(--radius-sm);
      margin-bottom: 16px;
      font-size: 0.84rem;
      background: var(--danger-soft);
      color: var(--danger);
    }

    @media (max-width: 740px) {
      .start-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class ProcedureStartPageComponent implements OnInit {
  private readonly workflowApi = inject(WorkflowApiService);
  private readonly applicantsApi = inject(ApplicantsApiService);
  private readonly proceduresApi = inject(ProceduresApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  protected readonly publishedWorkflows = signal<WorkflowSummary[]>([]);
  protected readonly applicants = signal<Applicant[]>([]);
  protected readonly starting = signal(false);
  protected readonly error = signal('');

  protected selectedWorkflowId = '';
  protected selectedApplicantId = '';

  ngOnInit(): void {
    this.loadWorkflows();
    this.loadApplicants();
  }

  protected start(): void {
    if (!this.selectedWorkflowId || !this.selectedApplicantId || this.starting()) return;
    this.starting.set(true);
    this.error.set('');

    this.proceduresApi.startProcedure({
      workflowDefinitionId: this.selectedWorkflowId,
      applicantId: this.selectedApplicantId,
      formData: {}
    }).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (procedure) => {
        void this.router.navigate(['/operation/procedures', procedure.id]);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message || 'No fue posible iniciar el tramite.');
        this.starting.set(false);
      }
    });
  }

  protected applicantLabel(applicant: Applicant): string {
    const name = applicant.name
      ?? applicant.businessName
      ?? [applicant.firstName, applicant.lastName].filter(Boolean).join(' ');
    return `${name || 'Solicitante'}${applicant.documentNumber ? ' — ' + applicant.documentNumber : ''}`;
  }

  private loadWorkflows(): void {
    this.workflowApi.getWorkflows().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (w) => this.publishedWorkflows.set(w.filter((item) => item.status === 'PUBLISHED')),
      error: (err: HttpErrorResponse) =>
        this.error.set(err.error?.message || 'No fue posible cargar las politicas.')
    });
  }

  private loadApplicants(): void {
    this.applicantsApi.getApplicants().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (a) => this.applicants.set(a.filter((item) => item.active !== false)),
      error: (err: HttpErrorResponse) =>
        this.error.set(err.error?.message || 'No fue posible cargar los solicitantes.')
    });
  }
}
