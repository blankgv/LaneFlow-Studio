import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { WorkflowSummary } from '../../design/models/workflow-summary.model';
import { WorkflowApiService } from '../../design/services/workflow-api.service';
import { Applicant } from '../models/applicant.model';
import { EvidenceCategory, PendingEvidence } from '../models/evidence.model';
import { ApplicantsApiService } from '../services/applicants-api.service';
import { EvidencesApiService } from '../services/evidences-api.service';
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

          <!-- Evidencias opcionales -->
          <div class="evidence-section">
            <div class="evidence-section__header">
              <div>
                <span class="field__label">Documentacion inicial</span>
                <span class="optional-badge">Opcional</span>
              </div>
              <p class="evidence-section__hint">Adjunta documentos que el tramite requiera desde el inicio.</p>
            </div>

            <div class="evidence-list">
              <div class="evidence-item" *ngFor="let ev of pendingEvidences; let i = index">
                <div class="evidence-item__top">
                  <label class="file-pick" [class.has-file]="ev.file">
                    <mat-icon>{{ ev.file ? 'attach_file' : 'upload_file' }}</mat-icon>
                    <span>{{ ev.file ? fileLabel(ev.file) : 'Seleccionar archivo' }}</span>
                    <input type="file" class="file-input" (change)="setFile(i, $event)" />
                  </label>
                  <button
                    mat-icon-button
                    type="button"
                    class="remove-btn"
                    title="Quitar"
                    *ngIf="pendingEvidences.length > 1"
                    (click)="removeEvidence(i)"
                  >
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
                <div class="evidence-item__bottom">
                  <input
                    class="inp"
                    type="text"
                    placeholder="Descripcion (opcional)"
                    [(ngModel)]="ev.description"
                    [name]="'desc' + i"
                  />
                  <select class="sel" [(ngModel)]="ev.category" [name]="'cat' + i">
                    <option *ngFor="let c of evidenceCategories" [ngValue]="c">{{ categoryLabel(c) }}</option>
                  </select>
                </div>
              </div>
            </div>

            <button mat-stroked-button type="button" class="add-btn" (click)="addEvidence()">
              <mat-icon>add</mat-icon>
              Agregar documento
            </button>

            <div class="upload-notice" *ngIf="pendingCount() > 0">
              <mat-icon>cloud_upload</mat-icon>
              {{ pendingCount() }} archivo(s) se subirán al crear el tramite.
            </div>
          </div>

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
          <p>Las tareas, formularios y flujo estan definidos en la politica seleccionada.</p>
          <p>Tambien podras adjuntar evidencias desde el detalle del tramite una vez creado.</p>
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
      grid-template-columns: minmax(0, 1fr) 260px;
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

    .info-icon { color: var(--accent); }

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

    .field select, .sel {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface-2);
      color: var(--text);
      padding: 9px 12px;
      font: inherit;
      font-size: 0.87rem;
    }

    .optional-badge {
      margin-left: 6px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 1px 7px;
    }

    /* Evidence section */
    .evidence-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
      border-top: 1px solid var(--border);
      padding-top: 14px;
    }

    .evidence-section__header {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .evidence-section__hint {
      margin: 0;
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .evidence-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .evidence-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface-2);
    }

    .evidence-item__top {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .evidence-item__bottom {
      display: grid;
      grid-template-columns: 1fr 160px;
      gap: 8px;
    }

    .file-pick {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      font-size: 0.82rem;
      color: var(--text-muted);
      overflow: hidden;
      min-width: 0;
    }

    .file-pick.has-file { color: var(--accent-strong); }

    .file-pick mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    .file-pick span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-input { display: none; }

    .inp {
      box-sizing: border-box;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface);
      color: var(--text);
      padding: 7px 10px;
      font: inherit;
      font-size: 0.85rem;
      width: 100%;
    }

    .remove-btn {
      color: var(--text-muted);
      width: 32px;
      height: 32px;
      flex-shrink: 0;
    }

    .add-btn {
      align-self: flex-start;
    }

    .upload-notice {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      background: var(--accent-soft);
      color: var(--accent-strong);
      font-size: 0.81rem;
      font-weight: 600;
    }

    .upload-notice mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
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
      .evidence-item { grid-template-columns: 1fr; }
    }
  `]
})
export class ProcedureStartPageComponent implements OnInit {
  private readonly workflowApi = inject(WorkflowApiService);
  private readonly applicantsApi = inject(ApplicantsApiService);
  private readonly proceduresApi = inject(ProceduresApiService);
  private readonly evidencesApi = inject(EvidencesApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  protected readonly publishedWorkflows = signal<WorkflowSummary[]>([]);
  protected readonly applicants = signal<Applicant[]>([]);
  protected readonly starting = signal(false);
  protected readonly error = signal('');

  protected selectedWorkflowId = '';
  protected selectedApplicantId = '';

  protected readonly evidenceCategories: EvidenceCategory[] = [
    'GENERAL', 'IDENTITY_DOCUMENT', 'SUPPORT_DOCUMENT', 'PAYMENT_RECEIPT', 'PHOTO', 'OTHER'
  ];
  protected pendingEvidences: PendingEvidence[] = [this.emptyEvidence()];

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
      switchMap((procedure) => {
        const uploads = this.pendingEvidences
          .filter((e) => e.file)
          .map((e) => this.evidencesApi.uploadProcedureEvidence({
            procedureId: procedure.id,
            file: e.file!,
            description: e.description,
            category: e.category
          }));
        return uploads.length > 0
          ? forkJoin(uploads).pipe(switchMap(() => of(procedure)))
          : of(procedure);
      }),
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

  protected pendingCount(): number {
    return this.pendingEvidences.filter((e) => e.file).length;
  }

  protected addEvidence(): void {
    this.pendingEvidences = [...this.pendingEvidences, this.emptyEvidence()];
  }

  protected removeEvidence(index: number): void {
    this.pendingEvidences = this.pendingEvidences.filter((_, i) => i !== index);
  }

  protected setFile(index: number, event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.pendingEvidences = this.pendingEvidences.map((e, i) =>
      i === index ? { ...e, file } : e
    );
  }

  protected fileLabel(file: File): string {
    const kb = Math.max(1, Math.round(file.size / 1024));
    return `${file.name} (${kb} KB)`;
  }

  protected categoryLabel(cat: EvidenceCategory): string {
    const labels: Record<EvidenceCategory, string> = {
      GENERAL: 'General',
      IDENTITY_DOCUMENT: 'Documento de identidad',
      SUPPORT_DOCUMENT: 'Documento de respaldo',
      PAYMENT_RECEIPT: 'Comprobante de pago',
      PHOTO: 'Foto',
      OTHER: 'Otro'
    };
    return labels[cat];
  }

  protected applicantLabel(a: Applicant): string {
    const name = a.name ?? a.businessName ?? [a.firstName, a.lastName].filter(Boolean).join(' ');
    return `${name || 'Solicitante'}${a.documentNumber ? ' — ' + a.documentNumber : ''}`;
  }

  private loadWorkflows(): void {
    this.workflowApi.getWorkflows().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (w) => this.publishedWorkflows.set(w.filter((item) => item.status === 'PUBLISHED')),
      error: (err: HttpErrorResponse) =>
        this.error.set(err.error?.message || 'No fue posible cargar las politicas.')
    });
  }

  private loadApplicants(): void {
    this.applicantsApi.getApplicants().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (a) => this.applicants.set(a.filter((item) => item.active !== false)),
      error: (err: HttpErrorResponse) =>
        this.error.set(err.error?.message || 'No fue posible cargar los solicitantes.')
    });
  }

  private emptyEvidence(): PendingEvidence {
    return { file: null, description: '', category: 'GENERAL' };
  }
}
