import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import {
  ProcedureHistory,
  ProcedureInstance,
  ProcedureStatus,
  ProcedureStatusInfo
} from '../models/procedure.model';
import { Evidence } from '../models/evidence.model';
import { EvidencesApiService } from '../services/evidences-api.service';
import { ProceduresApiService } from '../services/procedures-api.service';

@Component({
  selector: 'app-procedure-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <section class="procedure-detail">
      <header class="detail-header">
        <a class="back-btn" routerLink="/operation/procedures">
          <mat-icon>arrow_back</mat-icon>
        </a>
        <div>
          <h1>{{ procedure()?.code || 'Tramite' }}</h1>
          <p>{{ procedure()?.workflowName || 'Cargando detalle...' }}</p>
        </div>
        <span class="status-chip" [class]="statusClass(procedure()?.status)" *ngIf="procedure()">
          {{ statusLabel(procedure()!.status) }}
        </span>
      </header>

      <div class="state" *ngIf="loading()">
        <mat-icon>hourglass_empty</mat-icon>
        <span>Cargando tramite...</span>
      </div>

      <div class="state state--error" *ngIf="!loading() && error()">
        <mat-icon>error_outline</mat-icon>
        <strong>No se pudo cargar el tramite</strong>
        <span>{{ error() }}</span>
        <a mat-stroked-button routerLink="/operation/procedures">Volver</a>
      </div>

      <ng-container *ngIf="!loading() && !error() && procedure()">
        <div class="summary-grid">
          <article class="panel panel--wide">
            <h2>Estado actual</h2>
            <strong>{{ status()?.currentStage || procedure()!.currentNodeName || 'Sin etapa activa' }}</strong>
            <p>{{ status()?.statusMessage || fallbackStatusMessage(procedure()!.status) }}</p>
            <div class="meta-grid">
              <span>
                <mat-icon>person</mat-icon>
                {{ procedure()!.applicantName }}
              </span>
              <span *ngIf="procedure()!.applicantDocumentNumber">
                <mat-icon>badge</mat-icon>
                {{ procedure()!.applicantDocumentNumber }}
              </span>
              <span *ngIf="procedure()!.currentAssigneeUsername">
                <mat-icon>account_circle</mat-icon>
                {{ procedure()!.currentAssigneeUsername }}
              </span>
              <span>
                <mat-icon>event</mat-icon>
                {{ (procedure()!.startedAt || procedure()!.createdAt) | date:'dd/MM/yyyy HH:mm' }}
              </span>
            </div>
          </article>

          <article class="panel">
            <h2>Ultimo evento</h2>
            <strong>{{ status()?.lastEventTitle || procedure()!.lastAction || 'Sin eventos' }}</strong>
            <p>{{ status()?.lastEventMessage || procedure()!.lastComment || 'Aun no hay movimientos registrados.' }}</p>
          </article>
        </div>

        <section class="panel" *ngIf="procedure()!.status === 'OBSERVED'">
          <h2>Subsanar observacion</h2>
          <p>Registra un comentario y reingresa el tramite al flujo.</p>
          <label class="field">
            <span>Comentario *</span>
            <textarea rows="3" [(ngModel)]="resolveComment" name="resolveComment"></textarea>
          </label>
          <div class="actions">
            <button
              mat-flat-button
              color="primary"
              type="button"
              [disabled]="resolving() || !resolveComment.trim()"
              (click)="resolveObservation()"
            >
              <mat-icon>task_alt</mat-icon>
              {{ resolving() ? 'Enviando...' : 'Subsanar observacion' }}
            </button>
          </div>
        </section>

        <div class="detail-grid">
          <section class="panel">
            <h2>Datos del tramite</h2>
            <dl class="data-list">
              <div>
                <dt>Politica</dt>
                <dd>{{ procedure()!.workflowName }}</dd>
              </div>
              <div>
                <dt>Codigo politica</dt>
                <dd>{{ procedure()!.workflowCode || '-' }}</dd>
              </div>
              <div>
                <dt>Version</dt>
                <dd>{{ procedure()!.workflowVersion || '-' }}</dd>
              </div>
              <div>
                <dt>Iniciado por</dt>
                <dd>{{ procedure()!.startedBy || '-' }}</dd>
              </div>
              <div>
                <dt>Actualizado</dt>
                <dd>{{ procedure()!.updatedAt | date:'dd/MM/yyyy HH:mm' }}</dd>
              </div>
            </dl>
          </section>

          <section class="panel">
            <h2>Datos enviados</h2>
            <div class="empty-inline" *ngIf="formDataEntries().length === 0">
              Sin datos de formulario.
            </div>
            <dl class="data-list" *ngIf="formDataEntries().length > 0">
              <div *ngFor="let item of formDataEntries()">
                <dt>{{ item.key }}</dt>
                <dd>{{ item.value }}</dd>
              </div>
            </dl>
          </section>
        </div>

        <section class="panel">
          <h2>Evidencias</h2>
          <div class="evidence-groups">
            <div>
              <h3>Evidencia general</h3>
              <div class="empty-inline" *ngIf="generalEvidences().length === 0">
                No hay evidencia general.
              </div>
              <article class="evidence-card" *ngFor="let evidence of generalEvidences()">
                <mat-icon>attach_file</mat-icon>
                <div>
                  <strong>{{ evidence.originalFileName || evidence.fileName }}</strong>
                  <span>{{ evidence.description || categoryLabel(evidence.category) }}</span>
                  <small>{{ evidence.uploadedBy || '-' }} · {{ evidence.createdAt | date:'dd/MM/yyyy HH:mm' }}</small>
                </div>
                <a mat-stroked-button *ngIf="evidence.mediaLink" [href]="evidence.mediaLink" target="_blank" rel="noopener">
                  Abrir
                </a>
              </article>
            </div>

            <div>
              <h3>Evidencia desde tareas</h3>
              <div class="empty-inline" *ngIf="taskEvidences().length === 0">
                No hay evidencia subida desde tareas.
              </div>
              <article class="evidence-card" *ngFor="let evidence of taskEvidences()">
                <mat-icon>assignment</mat-icon>
                <div>
                  <strong>{{ evidence.originalFileName || evidence.fileName }}</strong>
                  <span>{{ evidence.fieldName || evidence.nodeId || 'Tarea' }} · {{ evidence.description || categoryLabel(evidence.category) }}</span>
                  <small>{{ evidence.uploadedBy || '-' }} · {{ evidence.createdAt | date:'dd/MM/yyyy HH:mm' }}</small>
                </div>
                <a mat-stroked-button *ngIf="evidence.mediaLink" [href]="evidence.mediaLink" target="_blank" rel="noopener">
                  Abrir
                </a>
              </article>
            </div>
          </div>
        </section>

        <section class="panel">
          <h2>Historial</h2>
          <div class="empty-inline" *ngIf="!history() || history()!.history.length === 0">
            No hay eventos de historial.
          </div>
          <ol class="timeline" *ngIf="history() && history()!.history.length > 0">
            <li *ngFor="let item of history()!.history">
              <span class="timeline__dot"></span>
              <div>
                <strong>{{ item.title || item.action }}</strong>
                <p>{{ item.message }}</p>
                <small>
                  {{ item.createdAt | date:'dd/MM/yyyy HH:mm' }}
                  <ng-container *ngIf="item.username"> · {{ item.username }}</ng-container>
                  <ng-container *ngIf="item.nodeName"> · {{ item.nodeName }}</ng-container>
                </small>
              </div>
            </li>
          </ol>
        </section>
      </ng-container>
    </section>
  `,
  styles: [`
    .procedure-detail {
      max-width: 1080px;
      padding: 28px 32px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .detail-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 4px;
    }

    .detail-header h1 {
      margin: 0;
      color: var(--text);
      font-size: 1.35rem;
    }

    .detail-header p {
      margin: 4px 0 0;
      color: var(--text-muted);
      font-size: 0.84rem;
    }

    .back-btn {
      display: inline-flex;
      color: var(--text-muted);
      text-decoration: none;
      padding: 5px;
      border-radius: 50%;
    }

    .back-btn:hover {
      color: var(--text);
      background: var(--surface-hover);
    }

    .summary-grid,
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .summary-grid {
      grid-template-columns: minmax(0, 1.3fr) minmax(280px, 0.7fr);
    }

    .panel {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .panel h2 {
      margin: 0;
      color: var(--text);
      font-size: 0.96rem;
    }

    .panel strong {
      color: var(--text);
      font-size: 0.95rem;
    }

    .panel p {
      margin: 0;
      color: var(--text-muted);
      font-size: 0.84rem;
      line-height: 1.5;
    }

    .meta-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .meta-grid span {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 999px;
      background: var(--surface-2);
      color: var(--text-muted);
      font-size: 0.72rem;
    }

    .meta-grid mat-icon {
      width: 13px;
      height: 13px;
      font-size: 13px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text);
    }

    .field textarea {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface-2);
      color: var(--text);
      padding: 9px 12px;
      font: inherit;
      font-weight: 400;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
    }

    .data-list {
      display: grid;
      gap: 10px;
      margin: 0;
    }

    .data-list div {
      display: grid;
      grid-template-columns: 130px minmax(0, 1fr);
      gap: 12px;
      align-items: start;
    }

    .data-list dt {
      color: var(--text-muted);
      font-size: 0.76rem;
      font-weight: 700;
    }

    .data-list dd {
      margin: 0;
      color: var(--text);
      font-size: 0.82rem;
      overflow-wrap: anywhere;
    }

    .empty-inline {
      padding: 12px;
      border-radius: var(--radius-sm);
      background: var(--surface-2);
      color: var(--text-muted);
      font-size: 0.84rem;
    }

    .timeline {
      list-style: none;
      display: grid;
      gap: 14px;
      margin: 0;
      padding: 0;
    }

    .timeline li {
      display: grid;
      grid-template-columns: 16px minmax(0, 1fr);
      gap: 10px;
      position: relative;
    }

    .timeline__dot {
      width: 9px;
      height: 9px;
      margin-top: 5px;
      border-radius: 50%;
      background: var(--accent);
    }

    .timeline p {
      margin: 3px 0;
    }

    .timeline small {
      color: var(--text-muted);
      font-size: 0.74rem;
    }

    .evidence-groups {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .evidence-groups h3 {
      margin: 0 0 10px;
      color: var(--text);
      font-size: 0.86rem;
    }

    .evidence-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface-2);
      margin-bottom: 8px;
    }

    .evidence-card > mat-icon {
      color: var(--accent-strong);
    }

    .evidence-card div {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .evidence-card span,
    .evidence-card small {
      color: var(--text-muted);
      font-size: 0.74rem;
    }

    .status-chip {
      margin-left: auto;
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 3px 10px;
      font-size: 0.72rem;
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

    .state--error,
    .state--error mat-icon {
      color: var(--danger);
    }

    @media (max-width: 900px) {
      .summary-grid,
      .detail-grid,
      .evidence-groups {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ProcedureDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly proceduresApi = inject(ProceduresApiService);
  private readonly evidencesApi = inject(EvidencesApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly procedure = signal<ProcedureInstance | null>(null);
  protected readonly status = signal<ProcedureStatusInfo | null>(null);
  protected readonly history = signal<ProcedureHistory | null>(null);
  protected readonly evidences = signal<Evidence[]>([]);
  protected readonly loading = signal(true);
  protected readonly resolving = signal(false);
  protected readonly error = signal('');
  protected resolveComment = '';

  private readonly procedureId = this.route.snapshot.paramMap.get('id') ?? '';

  ngOnInit(): void {
    this.loadDetail();
  }

  protected resolveObservation(): void {
    const comment = this.resolveComment.trim();
    if (!this.procedureId || !comment || this.resolving()) return;

    this.resolving.set(true);
    this.error.set('');

    this.proceduresApi.resolveObservation(this.procedureId, {
      comment,
      formData: this.procedure()?.formData ?? {}
    }).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (procedure) => {
        this.procedure.set(procedure);
        this.resolveComment = '';
        this.resolving.set(false);
        this.loadTracking();
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message || 'No fue posible subsanar la observacion.');
        this.resolving.set(false);
      }
    });
  }

  protected formDataEntries(): Array<{ key: string; value: string }> {
    const data = this.procedure()?.formData ?? {};
    return Object.entries(data).map(([key, value]) => ({
      key,
      value: this.formatValue(value)
    }));
  }

  protected generalEvidences(): Evidence[] {
    return this.evidences().filter((evidence) => !evidence.nodeId && !evidence.fieldName);
  }

  protected taskEvidences(): Evidence[] {
    return this.evidences().filter((evidence) => !!evidence.nodeId || !!evidence.fieldName);
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

  protected statusClass(status: ProcedureStatus | undefined): string {
    if (status === 'STARTED' || status === 'IN_PROGRESS') return 'status-chip status-chip--active';
    if (status === 'OBSERVED') return 'status-chip status-chip--observed';
    if (status === 'COMPLETED') return 'status-chip status-chip--done';
    if (status === 'REJECTED' || status === 'CANCELLED') return 'status-chip status-chip--rejected';
    return 'status-chip';
  }

  protected fallbackStatusMessage(status: ProcedureStatus): string {
    const messages: Record<ProcedureStatus, string> = {
      STARTED: 'El tramite fue registrado y esta iniciando su flujo.',
      IN_PROGRESS: 'El tramite se encuentra en revision.',
      OBSERVED: 'El tramite tiene observaciones pendientes de subsanacion.',
      REJECTED: 'El tramite fue rechazado.',
      COMPLETED: 'El tramite finalizo correctamente.',
      CANCELLED: 'El tramite fue cancelado.'
    };
    return messages[status] ?? '';
  }

  protected categoryLabel(category: Evidence['category']): string {
    const labels: Record<string, string> = {
      GENERAL: 'General',
      IDENTITY_DOCUMENT: 'Documento de identidad',
      SUPPORT_DOCUMENT: 'Documento de respaldo',
      PAYMENT_RECEIPT: 'Comprobante de pago',
      PHOTO: 'Foto',
      OTHER: 'Otro'
    };
    return category ? labels[category] ?? category : 'Sin descripcion';
  }

  private loadDetail(): void {
    if (!this.procedureId) {
      this.error.set('Identificador de tramite invalido.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.proceduresApi.getProcedure(this.procedureId).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (procedure) => {
        this.procedure.set(procedure);
        this.loading.set(false);
        this.loadTracking();
        this.loadEvidences();
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message || 'No fue posible cargar el tramite.');
        this.loading.set(false);
      }
    });
  }

  private loadTracking(): void {
    this.proceduresApi.getStatus(this.procedureId).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (status) => this.status.set(status),
      error: () => this.status.set(null)
    });

    this.proceduresApi.getHistory(this.procedureId).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (history) => this.history.set(history),
      error: () => this.history.set(null)
    });
  }

  private loadEvidences(): void {
    this.evidencesApi.getProcedureEvidences(this.procedureId).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (evidences) => this.evidences.set(evidences),
      error: () => this.evidences.set([])
    });
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '-';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
}
