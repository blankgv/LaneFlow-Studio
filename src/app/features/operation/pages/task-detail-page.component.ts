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

import { FormField } from '../../design/models/dynamic-form.model';
import { TaskInstance } from '../models/task-instance.model';
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
      <div class="no-form" *ngIf="!task()?.form">
        <mat-icon>info_outline</mat-icon>
        <p>Esta tarea no tiene formulario asociado.<br>Puedes completarla directamente.</p>
        <button mat-flat-button color="primary" [disabled]="completing()" (click)="submitAction('complete')">
          <mat-icon>check_circle</mat-icon>
          {{ completing() ? 'Completando...' : 'Completar tarea' }}
        </button>
      </div>

      <!-- Formulario dinámico -->
      <form class="task-form" (ngSubmit)="submitAction('complete')" *ngIf="task()?.form">
        <div class="task-form__title">
          <mat-icon>description</mat-icon>
          {{ task()!.form!.title }}
        </div>

        <div class="form-fields">
          <div class="form-field" *ngFor="let field of task()!.form!.fields">

            <label class="form-field__label">
              {{ field.label }}
              <span class="form-field__required" *ngIf="field.required">*</span>
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
              *ngIf="!isSpecialType(field)"
              class="form-field__input"
              [type]="inputType(field)"
              [required]="field.required"
              [(ngModel)]="values[field.name]"
              [name]="field.name"
            />

          </div>
        </div>

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
          <button mat-stroked-button type="button" [disabled]="completing()" (click)="submitAction('approve')">
            <mat-icon>thumb_up</mat-icon>
            Aprobar
          </button>
          <button mat-flat-button color="primary" type="submit" [disabled]="completing()">
            <mat-icon>check_circle</mat-icon>
            {{ completing() ? 'Completando...' : 'Completar tarea' }}
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

    /* Sin formulario */
    .no-form {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 40px;
      text-align: center;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--text-muted);
      font-size: 0.86rem;
    }

    .no-form mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: var(--text-subtle);
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
  private readonly destroyRef = inject(DestroyRef);

  protected readonly task = signal<TaskInstance | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly completing = signal(false);
  protected readonly completeError = signal('');
  protected comment = '';

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

    const formData: Record<string, unknown> = { ...this.values };
    const request = {
      complete: () => this.tasksApi.completeTask(this.taskId, formData, this.comment),
      approve: () => this.tasksApi.approveTask(this.taskId, formData, this.comment),
      observe: () => this.tasksApi.observeTask(this.taskId, formData, this.comment),
      reject: () => this.tasksApi.rejectTask(this.taskId, formData, this.comment)
    }[action]();

    request.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        void this.router.navigate(['/operation/tasks']);
      },
      error: (err: HttpErrorResponse) => {
        this.completeError.set(err.error?.message || 'No fue posible completar la tarea.');
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

  private loadTask(): void {
    this.tasksApi.getTask(this.taskId).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (task) => {
        this.task.set(task);
        this.initValues(task);
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
    task.form?.fields.forEach((f) => {
      this.values[f.name] = f.type === 'MULTISELECT' ? [] :
                             f.type === 'CHECKBOX'   ? false : '';
    });
  }
}
