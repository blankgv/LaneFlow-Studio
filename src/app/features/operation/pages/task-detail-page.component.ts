import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin, of, switchMap } from 'rxjs';

import { FormField } from '../../design/models/dynamic-form.model';
import { Evidence, EvidenceCategory, PendingEvidence } from '../models/evidence.model';
import { TaskInstance } from '../models/task-instance.model';
import { EvidencesApiService } from '../services/evidences-api.service';
import { TasksApiService } from '../services/tasks-api.service';

@Component({
  selector: 'app-task-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="task-detail" *ngIf="!loading() && !loadError(); else stateTpl">

      <header class="task-detail__header">
        <a class="back-btn" routerLink="/operation/tasks">
          <mat-icon>arrow_back</mat-icon>
        </a>
        <div class="task-detail__meta">
          <span class="task-detail__name">{{ taskName() }}</span>
          <span class="task-detail__workflow">{{ task()?.workflowName }}</span>
        </div>
        <span class="dept-chip" *ngIf="departmentLabel()">
          <mat-icon>corporate_fare</mat-icon>
          {{ departmentLabel() }}
        </span>
      </header>

      <!-- Error completar -->
      <div class="complete-error" *ngIf="completeError()">
        <mat-icon>error_outline</mat-icon>
        {{ completeError() }}
        <button type="button" class="complete-error__close" (click)="completeError.set('')">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Sin formulario -->
      <div class="task-form" *ngIf="!task()?.form">

        <div class="task-form__title">
          <mat-icon>info_outline</mat-icon>
          Sin formulario
        </div>

        <section class="context-panel" *ngIf="formDataEntries().length > 0">
          <h2>Datos acumulados del tramite</h2>
          <dl class="data-list">
            <div *ngFor="let item of formDataEntries()">
              <dt>{{ item.key }}</dt>
              <dd>{{ item.value }}</dd>
            </div>
          </dl>
        </section>

        <section class="evidence-panel" *ngIf="generalEvidences().length > 0">
          <h2>Evidencias del tramite</h2>
          <div class="evidence-list">
            <article class="evidence-card" *ngFor="let evidence of generalEvidences()">
              <mat-icon>attach_file</mat-icon>
              <div>
                <strong>{{ evidence.originalFileName || evidence.fileName }}</strong>
                <span>{{ evidence.description || categoryLabel(evidence.category) }}</span>
              </div>
              <a mat-stroked-button *ngIf="evidence.mediaLink" [href]="evidence.mediaLink" target="_blank" rel="noopener">Abrir</a>
            </article>
          </div>
        </section>

        <section class="evidence-panel" *ngIf="taskAttachmentGroups().length > 0">
          <h2>Adjuntos de formularios anteriores</h2>
          <div class="attachment-groups">
            <div class="attachment-group" *ngFor="let group of taskAttachmentGroups()">
              <h3>{{ group.label }}</h3>
              <article class="evidence-card" *ngFor="let evidence of group.items">
                <mat-icon>assignment</mat-icon>
                <div>
                  <strong>{{ evidence.originalFileName || evidence.fileName }}</strong>
                  <span>{{ evidence.fieldName || categoryLabel(evidence.category) }}</span>
                </div>
                <a mat-stroked-button *ngIf="evidence.mediaLink" [href]="evidence.mediaLink" target="_blank" rel="noopener">Abrir</a>
              </article>
            </div>
          </div>
        </section>

        <div class="form-field">
          <label class="form-field__label">Comentario</label>
          <textarea
            class="form-field__input"
            rows="3"
            name="noform_comment"
            [(ngModel)]="comment"
          ></textarea>
        </div>

        <div class="task-form__actions">
          <a mat-stroked-button routerLink="/operation/tasks">Cancelar</a>
          <button mat-stroked-button type="button" [disabled]="completing()" (click)="submitAction('observe')">
            <mat-icon>visibility</mat-icon>
            Observar
          </button>
          <button mat-stroked-button type="button" [disabled]="completing()" (click)="submitAction('reject')">
            <mat-icon>cancel</mat-icon>
            Rechazar
          </button>
          <button mat-flat-button color="primary" type="button" [disabled]="completing()" (click)="submitAction('approve')">
            <mat-icon>thumb_up</mat-icon>
            {{ completing() ? 'Procesando...' : 'Aprobar' }}
          </button>
        </div>

      </div>

      <!-- Formulario dinámico -->
      <form class="task-form" (ngSubmit)="$event.preventDefault()" *ngIf="task()?.form">
        <div class="task-form__title">
          <mat-icon>description</mat-icon>
          {{ task()!.form!.title }}
        </div>

        <div class="form-fields">
          <div class="form-field" *ngFor="let field of task()!.form!.fields">

            <label class="form-field__label">
              {{ field.label }}
              <span class="form-field__required" *ngIf="field.required">*</span>
              <span class="inherited-chip" *ngIf="hasInheritedValue(field)">Valor heredado</span>
            </label>

            <textarea
              *ngIf="field.type === 'TEXTAREA'"
              class="form-field__input"
              rows="4"
              [required]="field.required"
              [(ngModel)]="values[field.name]"
              [name]="field.name"
            ></textarea>

            <select
              *ngIf="field.type === 'SELECT' || field.type === 'RADIO'"
              class="form-field__input form-field__select"
              [required]="field.required"
              [(ngModel)]="values[field.name]"
              [name]="field.name"
            >
              <option value="">— Selecciona —</option>
              <option *ngFor="let opt of field.options ?? []" [value]="opt">{{ opt }}</option>
            </select>

            <div class="form-field__checkboxes" *ngIf="field.type === 'MULTISELECT'">
              <label
                class="form-field__checkbox-item"
                *ngFor="let opt of field.options ?? []"
              >
                <input
                  type="checkbox"
                  [value]="opt"
                  (change)="toggleMulti(field.name, opt, $any($event.target).checked)"
                />
                {{ opt }}
              </label>
            </div>

            <label class="form-field__checkbox-single" *ngIf="field.type === 'CHECKBOX'">
              <input
                type="checkbox"
                [(ngModel)]="values[field.name]"
                [name]="field.name"
              />
              {{ field.label }}
            </label>

            <input
              *ngIf="!isSpecialType(field) && !isFileType(field)"
              class="form-field__input"
              [type]="inputType(field)"
              [required]="field.required"
              [(ngModel)]="values[field.name]"
              [name]="field.name"
            />

            <div class="field-evidence" *ngIf="isFileType(field)">
              <input
                class="form-field__input"
                type="file"
                [required]="field.required"
                (change)="setTaskEvidenceFile(field.name, $event)"
              />
              <input
                class="form-field__input"
                placeholder="Descripcion del adjunto"
                [(ngModel)]="taskEvidenceUploads[field.name].description"
                [name]="field.name + '_description'"
              />
              <select
                class="form-field__input form-field__select"
                [(ngModel)]="taskEvidenceUploads[field.name].category"
                [name]="field.name + '_category'"
              >
                <option *ngFor="let category of evidenceCategories" [ngValue]="category">
                  {{ categoryLabel(category) }}
                </option>
              </select>
            </div>

          </div>
        </div>

        <section class="context-panel" *ngIf="formDataEntries().length > 0">
          <h2>Datos acumulados del tramite</h2>
          <dl class="data-list">
            <div *ngFor="let item of formDataEntries()">
              <dt>{{ item.key }}</dt>
              <dd>
                {{ item.value }}
              </dd>
            </div>
          </dl>
        </section>

        <section class="evidence-panel" *ngIf="generalEvidences().length > 0">
          <h2>Evidencias del tramite</h2>
          <div class="evidence-list">
            <div>
              <h3>Generales</h3>
              <article class="evidence-card" *ngFor="let evidence of generalEvidences()">
                <mat-icon>attach_file</mat-icon>
                <div>
                  <strong>{{ evidence.originalFileName || evidence.fileName }}</strong>
                  <span>{{ evidence.description || categoryLabel(evidence.category) }}</span>
                </div>
                <a mat-stroked-button *ngIf="evidence.mediaLink" [href]="evidence.mediaLink" target="_blank" rel="noopener">Abrir</a>
              </article>
              <p class="empty-evidence" *ngIf="generalEvidences().length === 0">Sin evidencias generales.</p>
            </div>
            <div class="hidden-evidence-group">
              <h3>Desde tareas</h3>
              <article class="evidence-card" *ngFor="let evidence of taskEvidences()">
                <mat-icon>assignment</mat-icon>
                <div>
                  <strong>{{ evidence.originalFileName || evidence.fileName }}</strong>
                  <span>{{ evidence.fieldName || evidence.nodeId || 'Tarea' }} · {{ evidence.description || categoryLabel(evidence.category) }}</span>
                </div>
                <a mat-stroked-button *ngIf="evidence.mediaLink" [href]="evidence.mediaLink" target="_blank" rel="noopener">Abrir</a>
              </article>
              <p class="empty-evidence" *ngIf="taskEvidences().length === 0">Sin evidencia desde tareas.</p>
            </div>
          </div>
        </section>

        <section class="evidence-panel" *ngIf="taskAttachmentGroups().length > 0">
          <h2>Adjuntos de formularios anteriores</h2>
          <div class="attachment-groups">
            <div class="attachment-group" *ngFor="let group of taskAttachmentGroups()">
              <h3>{{ group.label }}</h3>
              <article class="evidence-card" *ngFor="let evidence of group.items">
                <mat-icon>assignment</mat-icon>
                <div>
                  <strong>{{ evidence.originalFileName || evidence.fileName }}</strong>
                  <span>{{ evidence.fieldName || categoryLabel(evidence.category) }}</span>
                </div>
                <a mat-stroked-button *ngIf="evidence.mediaLink" [href]="evidence.mediaLink" target="_blank" rel="noopener">Abrir</a>
              </article>
            </div>
          </div>
        </section>

        <div class="form-field">
          <label class="form-field__label">Comentario</label>
          <textarea
            class="form-field__input"
            rows="3"
            name="comment"
            [(ngModel)]="comment"
          ></textarea>
        </div>

        <div class="task-form__actions">
          <a mat-stroked-button routerLink="/operation/tasks">Cancelar</a>
          <button mat-stroked-button type="button" [disabled]="completing()" (click)="submitAction('observe')">
            <mat-icon>visibility</mat-icon>
            Observar
          </button>
          <button mat-stroked-button type="button" [disabled]="completing()" (click)="submitAction('reject')">
            <mat-icon>cancel</mat-icon>
            Rechazar
          </button>
          <button mat-flat-button color="primary" type="button" [disabled]="completing()" (click)="submitAction('approve')">
            <mat-icon>thumb_up</mat-icon>
            {{ completing() ? 'Procesando...' : 'Aprobar' }}
          </button>
        </div>
      </form>

    </div>

    <!-- Estado carga / error -->
    <ng-template #stateTpl>
      <div class="task-state">
        <ng-container *ngIf="loading()">
          <mat-icon>hourglass_empty</mat-icon>
          <span>Cargando tarea...</span>
        </ng-container>
        <ng-container *ngIf="loadError()">
          <mat-icon>error_outline</mat-icon>
          <strong>No se pudo cargar la tarea</strong>
          <span>{{ loadError() }}</span>
          <a mat-stroked-button routerLink="/operation/tasks">Volver</a>
        </ng-container>
      </div>
    </ng-template>
  `,
  styles: [`
    .task-detail {
      max-width: 720px;
      margin: 0 auto;
      padding: 28px 32px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Header */
    .task-detail__header {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .back-btn {
      display: inline-flex;
      align-items: center;
      color: var(--text-muted);
      text-decoration: none;
      padding: 4px;
      border-radius: 50%;
      transition: background 120ms, color 120ms;
      flex-shrink: 0;
    }

    .back-btn:hover {
      background: var(--surface-hover);
      color: var(--text);
    }

    .task-detail__meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      min-width: 0;
    }

    .task-detail__name {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text);
    }

    .task-detail__workflow {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .dept-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.76rem;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 999px;
      background: var(--surface-2);
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .dept-chip mat-icon {
      font-size: 13px;
      width: 13px;
      height: 13px;
    }

    /* Error completar */
    .complete-error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: var(--danger-soft);
      color: var(--danger);
      font-size: 0.84rem;
      border-radius: var(--radius-sm);
    }

    .complete-error mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .complete-error__close {
      margin-left: auto;
      background: transparent;
      border: 0;
      cursor: pointer;
      color: var(--danger);
      display: inline-flex;
      align-items: center;
    }

    /* Formulario */
    .task-form {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .task-form__title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1rem;
      font-weight: 700;
      color: var(--text);
    }

    .task-form__title mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--accent-strong);
    }

    .task-form__desc {
      font-size: 0.84rem;
      color: var(--text-muted);
      margin: 0;
    }

    .form-fields {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-field__label {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text);
    }

    .form-field__required {
      color: var(--danger);
      margin-left: 2px;
    }

    .inherited-chip {
      display: inline-flex;
      margin-left: 6px;
      padding: 1px 6px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent-strong);
      font-size: 0.68rem;
      font-weight: 700;
      vertical-align: middle;
    }

    .form-field__input {
      width: 100%;
      box-sizing: border-box;
      padding: 9px 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface-2);
      color: var(--text);
      font-size: 0.86rem;
      outline: none;
      transition: border-color 150ms;
    }

    .form-field__input:focus {
      border-color: var(--accent);
    }

    .form-field__select {
      appearance: auto;
    }

    .form-field__checkboxes {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-field__checkbox-item,
    .form-field__checkbox-single {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.86rem;
      color: var(--text);
      cursor: pointer;
    }

    .form-field__hint {
      font-size: 0.76rem;
      color: var(--text-muted);
      margin: 0;
    }

    .field-evidence {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 170px;
      gap: 8px;
    }

    .evidence-panel {
      display: flex;
      flex-direction: column;
      gap: 12px;
      border-top: 1px solid var(--border);
      padding-top: 18px;
    }

    .context-panel {
      display: flex;
      flex-direction: column;
      gap: 12px;
      border-top: 1px solid var(--border);
      padding-top: 18px;
    }

    .evidence-panel h2,
    .context-panel h2 {
      margin: 0;
      color: var(--text);
      font-size: 0.96rem;
    }

    .data-list {
      display: grid;
      gap: 8px;
      margin: 0;
    }

    .data-list div {
      display: grid;
      grid-template-columns: 150px minmax(0, 1fr);
      gap: 12px;
      padding: 8px 10px;
      border-radius: var(--radius-sm);
      background: var(--surface-2);
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

    .evidence-list {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .evidence-list h3 {
      margin: 0 0 8px;
      color: var(--text);
      font-size: 0.84rem;
    }

    .hidden-evidence-group {
      display: none;
    }

    .attachment-groups {
      display: grid;
      gap: 14px;
    }

    .attachment-group h3 {
      margin: 0 0 8px;
      color: var(--text);
      font-size: 0.84rem;
    }

    .evidence-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface-2);
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
    .empty-evidence {
      color: var(--text-muted);
      font-size: 0.74rem;
    }

    .task-form__actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      padding-top: 8px;
      border-top: 1px solid var(--border);
    }

    /* Estado */
    .task-state {
      display: grid;
      place-items: center;
      gap: 10px;
      height: 60vh;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.86rem;
    }

    .task-state mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: var(--text-subtle);
    }

    .task-state strong {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text);
    }
  `]
})
export class TaskDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tasksApi = inject(TasksApiService);
  private readonly evidencesApi = inject(EvidencesApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly task = signal<TaskInstance | null>(null);
  protected readonly procedureEvidences = signal<Evidence[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly completing = signal(false);
  protected readonly completeError = signal('');
  protected comment = '';
  protected readonly evidenceCategories: EvidenceCategory[] = [
    'GENERAL',
    'IDENTITY_DOCUMENT',
    'SUPPORT_DOCUMENT',
    'PAYMENT_RECEIPT',
    'PHOTO',
    'OTHER'
  ];
  protected taskEvidenceUploads: Record<string, PendingEvidence> = {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected values: Record<string, any> = {};

  private taskId = '';

  ngOnInit(): void {
    this.taskId = this.route.snapshot.paramMap.get('id') ?? '';
    this.loadTask();
  }

  protected submitAction(action: 'complete' | 'approve' | 'observe' | 'reject'): void {
    if (this.completing()) return;
    this.completing.set(true);
    this.completeError.set('');

    if (!this.validateRequiredEvidence()) {
      this.completing.set(false);
      return;
    }

    const currentTask = this.task();
    const formData: Record<string, unknown> = { ...this.values };
    const uploads = this.buildTaskEvidenceUploads(currentTask);
    const uploadRequest = uploads.length > 0 ? forkJoin(uploads) : of([]);
    const actionRequest = {
      complete: () => this.tasksApi.completeTask(this.taskId, formData, this.comment),
      approve: () => this.tasksApi.approveTask(this.taskId, formData, this.comment),
      observe: () => this.tasksApi.observeTask(this.taskId, formData, this.comment),
      reject: () => this.tasksApi.rejectTask(this.taskId, formData, this.comment)
    }[action];

    uploadRequest.pipe(
      switchMap(() => actionRequest()),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        void this.router.navigate(['/operation/tasks']);
      },
      error: (err: HttpErrorResponse) => {
        this.completeError.set(err.error?.message || 'No fue posible subir evidencias o completar la tarea.');
        this.completing.set(false);
      }
    });
  }

  protected taskName(): string {
    const task = this.task();
    return task?.name ?? task?.taskName ?? task?.taskDefinitionKey ?? 'Tarea';
  }

  protected departmentLabel(): string {
    const task = this.task();
    return task?.responsibleDepartmentName
      ?? task?.departmentName
      ?? task?.responsibleDepartmentCode
      ?? task?.departmentCode
      ?? '';
  }

  protected isSpecialType(field: FormField): boolean {
    return ['TEXTAREA', 'SELECT', 'RADIO', 'MULTISELECT', 'CHECKBOX'].includes(field.type);
  }

  protected isFileType(field: FormField): boolean {
    return ['FILE', 'IMAGE', 'PHOTO', 'AUDIO', 'VIDEO', 'DOCUMENT'].includes(field.type);
  }

  protected inputType(field: FormField): string {
    const map: Record<string, string> = {
      NUMBER: 'number',
      DATE: 'date',
      FILE: 'file',
      IMAGE: 'file',
      PHOTO: 'file',
      AUDIO: 'file',
      VIDEO: 'file',
      DOCUMENT: 'file'
    };
    return map[field.type] ?? 'text';
  }

  protected toggleMulti(key: string, value: string, checked: boolean): void {
    const current: string[] = this.values[key] ?? [];
    if (checked) {
      this.values[key] = [...current, value];
    } else {
      this.values[key] = current.filter((v) => v !== value);
    }
  }

  protected hasInheritedValue(field: FormField): boolean {
    if (this.isFileType(field)) return false;
    return Object.prototype.hasOwnProperty.call(this.task()?.formData ?? {}, field.name);
  }

  protected setTaskEvidenceFile(fieldName: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.ensureTaskEvidenceUpload(fieldName);
    this.taskEvidenceUploads[fieldName] = {
      ...this.taskEvidenceUploads[fieldName],
      file
    };
  }

  protected generalEvidences(): Evidence[] {
    return this.procedureEvidences().filter((evidence) => !evidence.nodeId && !evidence.fieldName);
  }

  protected taskEvidences(): Evidence[] {
    return this.procedureEvidences().filter((evidence) => !!evidence.nodeId || !!evidence.fieldName);
  }

  protected categoryLabel(category: EvidenceCategory | Evidence['category']): string {
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

  protected formDataEntries(): Array<{ key: string; value: string }> {
    const data = this.task()?.formData ?? {};
    return Object.entries(data).map(([key, value]) => ({
      key,
      value: this.formatValue(value)
    }));
  }

  protected taskAttachmentGroups(): Array<{ label: string; items: Evidence[] }> {
    const groups = new Map<string, Evidence[]>();
    this.taskEvidences().forEach((evidence) => {
      const key = evidence.nodeId || 'Tarea sin nodo';
      groups.set(key, [...(groups.get(key) ?? []), evidence]);
    });
    return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
  }

  private loadTask(): void {
    this.tasksApi.getTask(this.taskId).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (task) => {
        this.task.set(task);
        this.initValues(task);
        this.loadEvidences(task);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loadError.set(err.error?.message || 'No se pudo cargar la tarea.');
        this.loading.set(false);
      }
    });
  }

  private initValues(task: TaskInstance): void {
    this.values = {};
    this.taskEvidenceUploads = {};
    const savedData = task.formData ?? {};
    task.form?.fields.forEach((f) => {
      if (this.isFileType(f)) {
        this.ensureTaskEvidenceUpload(f.name);
        return;
      }
      const inherited = savedData[f.name];
      this.values[f.name] = inherited ?? (
        f.type === 'MULTISELECT' ? [] :
        f.type === 'CHECKBOX' ? false : ''
      );
    });
  }

  private ensureTaskEvidenceUpload(fieldName: string): void {
    this.taskEvidenceUploads[fieldName] ??= { file: null, description: '', category: 'GENERAL' };
  }

  private validateRequiredEvidence(): boolean {
    const missing = this.task()?.form?.fields.some((field) =>
      this.isFileType(field) && field.required && !this.taskEvidenceUploads[field.name]?.file
    );
    if (missing) {
      this.completeError.set('Adjunta los archivos obligatorios antes de continuar.');
      return false;
    }
    return true;
  }

  private buildTaskEvidenceUploads(task: TaskInstance | null) {
    if (!task?.procedureId) return [];

    return Object.entries(this.taskEvidenceUploads)
      .filter(([, upload]) => upload.file)
      .map(([fieldName, upload]) => this.evidencesApi.uploadTaskEvidence({
        procedureId: task.procedureId!,
        taskId: this.taskId,
        nodeId: task.taskDefinitionKey ?? task.id ?? task.taskId,
        fieldName,
        file: upload.file!,
        description: upload.description,
        category: upload.category
      }));
  }

  private loadEvidences(task: TaskInstance): void {
    if (!task.procedureId) {
      this.procedureEvidences.set([]);
      return;
    }

    this.evidencesApi.getProcedureEvidences(task.procedureId).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (evidences) => this.procedureEvidences.set(evidences),
      error: () => this.procedureEvidences.set([])
    });
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '-';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
}
