import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, EventEmitter,
  Input, OnInit, Output, inject, signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ApiError } from '../../../../core/models/api-error.model';
import { DynamicForm, FieldType, FormField } from '../../models/dynamic-form.model';
import { FieldPayload } from '../../models/form-payload.model';
import { WorkflowTask } from '../../models/workflow-task.model';
import { FormsApiService } from '../../services/forms-api.service';

interface FieldTypeOption {
  value: FieldType;
  label: string;
}

const FIELD_TYPES: FieldTypeOption[] = [
  { value: 'TEXT',        label: 'Texto corto' },
  { value: 'TEXTAREA',    label: 'Texto largo' },
  { value: 'NUMBER',      label: 'Numero' },
  { value: 'DATE',        label: 'Fecha' },
  { value: 'SELECT',      label: 'Seleccion unica' },
  { value: 'RADIO',       label: 'Radio' },
  { value: 'MULTISELECT', label: 'Seleccion multiple' },
  { value: 'CHECKBOX',    label: 'Casilla' },
  { value: 'FILE',        label: 'Archivo' },
  { value: 'IMAGE',       label: 'Imagen' },
  { value: 'PHOTO',       label: 'Foto' },
  { value: 'AUDIO',       label: 'Audio' },
  { value: 'VIDEO',       label: 'Video' },
  { value: 'DOCUMENT',    label: 'Documento' }
];

@Component({
  selector: 'app-form-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule],
  template: `
    <div class="form-panel">

      <!-- Header -->
      <div class="form-panel__header">
        <button type="button" class="back-btn" (click)="back.emit()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="form-panel__title">
          <span class="form-panel__task">{{ task.nodeName }}</span>
          <span class="form-panel__dept">{{ task.departmentName || task.departmentCode }}</span>
        </div>
      </div>

      <!-- Loading -->
      <div class="form-panel__state" *ngIf="loading()">
        <mat-icon>hourglass_empty</mat-icon>
        <span>Cargando...</span>
      </div>

      <!-- Error -->
      <div class="form-panel__error" *ngIf="errorMessage()">{{ errorMessage() }}</div>

      <!-- Sin formulario -->
      <div class="form-panel__empty" *ngIf="!loading() && !form() && !errorMessage()">
        <mat-icon>assignment_add</mat-icon>
        <span>Esta tarea no tiene formulario.</span>
        <button mat-flat-button color="primary" (click)="createForm()">
          <mat-icon>add</mat-icon>
          Crear formulario
        </button>
      </div>

      <!-- Formulario existente -->
      <ng-container *ngIf="!loading() && form()">

        <div class="form-panel__name">
          <span class="form-panel__form-title">{{ form()!.title }}</span>
          <button type="button" class="delete-form-btn" (click)="deleteForm()" title="Eliminar formulario">
            <mat-icon>delete_outline</mat-icon>
          </button>
        </div>

        <!-- Campos -->
        <ul class="fields-list" *ngIf="form()!.fields.length > 0">
          <li *ngFor="let field of form()!.fields" class="field-item">
            <div class="field-item__info">
              <span class="field-item__label">{{ field.label }}</span>
              <span class="field-item__meta">{{ fieldTypeLabel(field.type) }}{{ field.required ? ' · Requerido' : '' }}</span>
            </div>
          </li>
        </ul>

        <div class="fields-empty" *ngIf="form()!.fields.length === 0">
          Sin campos aun.
        </div>

        <!-- Agregar campo -->
        <div class="add-field-section">
          <button
            type="button"
            class="add-field-toggle"
            (click)="toggleAddField()"
          >
            <mat-icon>{{ addingField() ? 'remove' : 'add' }}</mat-icon>
            {{ addingField() ? 'Cancelar' : 'Agregar campo' }}
          </button>

          <div class="add-field-form" *ngIf="addingField()">
            <div class="field-row">
              <label class="field-label">Etiqueta</label>
              <input
                class="field-input"
                type="text"
                [(ngModel)]="newLabel"
                placeholder="Ej: Comentario"
                (ngModelChange)="onLabelChange($event)"
              />
            </div>
            <div class="field-row">
              <label class="field-label">Nombre tecnico</label>
              <input
                class="field-input"
                type="text"
                [(ngModel)]="newName"
                placeholder="Ej: comentario"
              />
            </div>
            <div class="field-row">
              <label class="field-label">Tipo</label>
              <select class="field-select" [(ngModel)]="newType">
                <option *ngFor="let t of fieldTypes" [value]="t.value">{{ t.label }}</option>
              </select>
            </div>
            <div class="field-row field-row--check">
              <label class="field-check">
                <input type="checkbox" [(ngModel)]="newRequired" />
                <span>Requerido</span>
              </label>
            </div>
            <button
              mat-flat-button
              color="primary"
              class="add-field-submit"
              [disabled]="!newLabel || !newName || savingField()"
              (click)="addField()"
            >
              {{ savingField() ? 'Guardando...' : 'Guardar campo' }}
            </button>
          </div>
        </div>

      </ng-container>
    </div>
  `,
  styles: [`
    .form-panel {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .form-panel__header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 12px 12px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 12px;
    }

    .back-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border: 0;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      flex-shrink: 0;
      transition: background 120ms ease, color 120ms ease;
    }

    .back-btn:hover {
      background: var(--surface-hover);
      color: var(--text);
    }

    .back-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .form-panel__title {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .form-panel__task {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text);
    }

    .form-panel__dept {
      font-size: 0.76rem;
      color: var(--text-muted);
    }

    .form-panel__state {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px;
      color: var(--text-muted);
      font-size: 0.84rem;
    }

    .form-panel__state mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .form-panel__error {
      margin: 0 16px 12px;
      padding: 8px 12px;
      background: var(--danger-soft);
      color: var(--danger);
      font-size: 0.82rem;
      border-radius: var(--radius-sm);
      border: 1px solid rgba(185,28,28,0.18);
    }

    .form-panel__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 24px 16px;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.84rem;
    }

    .form-panel__empty mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: var(--text-subtle);
    }

    .form-panel__name {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px 10px;
    }

    .form-panel__form-title {
      font-size: 0.86rem;
      font-weight: 600;
      color: var(--text);
    }

    .delete-form-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: 0;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--text-subtle);
      cursor: pointer;
      transition: color 120ms ease, background 120ms ease;
    }

    .delete-form-btn:hover {
      color: var(--danger);
      background: var(--danger-soft);
    }

    .delete-form-btn mat-icon {
      font-size: 17px;
      width: 17px;
      height: 17px;
    }

    .fields-list {
      list-style: none;
      margin: 0;
      padding: 0 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .field-item {
      display: flex;
      align-items: center;
      padding: 8px 10px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface);
    }

    .field-item__info {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
    }

    .field-item__label {
      font-size: 0.84rem;
      font-weight: 600;
      color: var(--text);
    }

    .field-item__meta {
      font-size: 0.74rem;
      color: var(--text-muted);
    }

    .fields-empty {
      padding: 8px 16px;
      font-size: 0.82rem;
      color: var(--text-muted);
    }

    .add-field-section {
      padding: 12px 16px 0;
      border-top: 1px solid var(--border);
      margin-top: 12px;
    }

    .add-field-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      padding: 7px 10px;
      border: 1px dashed var(--border-strong);
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--text-muted);
      font-size: 0.84rem;
      font-weight: 500;
      cursor: pointer;
      transition: color 120ms ease, border-color 120ms ease, background 120ms ease;
    }

    .add-field-toggle:hover {
      color: var(--accent);
      border-color: var(--accent);
      background: var(--accent-soft);
    }

    .add-field-toggle mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .add-field-form {
      margin-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .field-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .field-label {
      font-size: 0.76rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .field-input,
    .field-select {
      width: 100%;
      padding: 6px 10px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface);
      font-size: 0.84rem;
      color: var(--text);
      outline: none;
      transition: border-color 120ms ease;
    }

    .field-input:focus,
    .field-select:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-soft);
    }

    .field-row--check {
      flex-direction: row;
    }

    .field-check {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 0.84rem;
      color: var(--text);
      cursor: pointer;
    }

    .add-field-submit {
      width: 100%;
      margin-top: 4px;
    }
  `]
})
export class FormPanelComponent implements OnInit {
  @Input({ required: true }) task!: WorkflowTask;
  @Input({ required: true }) workflowId!: string;

  @Output() readonly back = new EventEmitter<void>();
  @Output() readonly formUpdated = new EventEmitter<DynamicForm>();

  private readonly formsApi = inject(FormsApiService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly form = signal<DynamicForm | null>(null);
  protected readonly addingField = signal(false);
  protected readonly savingField = signal(false);

  protected readonly fieldTypes = FIELD_TYPES;
  protected newLabel = '';
  protected newName = '';
  protected newType: FieldType = 'TEXT';
  protected newRequired = false;

  ngOnInit(): void {
    this.loadForm();
  }

  protected fieldTypeLabel(type: FieldType): string {
    return FIELD_TYPES.find((t) => t.value === type)?.label ?? type;
  }

  protected onLabelChange(label: string): void {
    this.newName = label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }

  protected toggleAddField(): void {
    this.addingField.update((v) => !v);
    if (!this.addingField()) {
      this.resetNewField();
    }
  }

  protected createForm(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.formsApi.createForm({
      workflowDefinitionId: this.workflowId,
      nodeId: this.task.nodeId,
      nodeName: this.task.nodeName,
      title: this.task.nodeName
    }).subscribe({
      next: (form) => {
        this.form.set(form);
        this.formUpdated.emit(form);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        const apiError = error.error as Partial<ApiError> | null;
        this.errorMessage.set(apiError?.message || 'No fue posible crear el formulario.');
        this.loading.set(false);
      }
    });
  }

  protected addField(): void {
    const form = this.form();
    if (!form || !this.newLabel || !this.newName) return;

    this.savingField.set(true);
    this.errorMessage.set('');

    const payload: FieldPayload = {
      name: this.newName,
      label: this.newLabel,
      type: this.newType,
      required: this.newRequired,
      order: form.fields.length + 1,
      options: null,
      validations: [],
      fileConfig: null
    };

    this.formsApi.addField(form.id, payload).subscribe({
      next: (field: FormField) => {
        this.form.update((f) => f ? { ...f, fields: [...f.fields, field] } : f);
        this.savingField.set(false);
        this.addingField.set(false);
        this.resetNewField();
      },
      error: (error: HttpErrorResponse) => {
        const apiError = error.error as Partial<ApiError> | null;
        this.errorMessage.set(apiError?.message || 'No fue posible agregar el campo.');
        this.savingField.set(false);
      }
    });
  }

  protected deleteForm(): void {
    const form = this.form();
    if (!form) return;

    if (!confirm(`Se eliminara el formulario "${form.title}" y todos sus campos.`)) return;

    this.formsApi.deleteForm(form.id).subscribe({
      next: () => {
        this.form.set(null);
        this.formUpdated.emit(null as unknown as DynamicForm);
      },
      error: (error: HttpErrorResponse) => {
        const apiError = error.error as Partial<ApiError> | null;
        this.errorMessage.set(apiError?.message || 'No fue posible eliminar el formulario.');
      }
    });
  }

  private loadForm(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.formsApi.getFormByNode(this.workflowId, this.task.nodeId).subscribe({
      next: (form) => {
        this.form.set(form);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 404 || error.status === 400) {
          // 404 = no existe formulario, 400 = nodo inválido/sin formulario
          this.form.set(null);
        } else {
          const apiError = error.error as Partial<ApiError> | null;
          this.errorMessage.set(apiError?.message || 'No fue posible cargar el formulario.');
        }
        this.loading.set(false);
      }
    });
  }

  private resetNewField(): void {
    this.newLabel = '';
    this.newName = '';
    this.newType = 'TEXT';
    this.newRequired = false;
  }
}
