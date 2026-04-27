import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, inject, signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { WorkflowApiService } from '../../services/workflow-api.service';

/** Genera el BPMN inicial: 1 pool (nombre = política) + 1 lane vacío. */
function buildInitialBpmn(policyName: string): string {
  const safe = policyName
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  id="Definitions_1"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:collaboration id="Collaboration_1">
    <bpmn:participant id="Participant_1" name="${safe}" processRef="Process_1" />
  </bpmn:collaboration>
  <bpmn:process id="Process_1" isExecutable="true" />
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_1">
      <bpmndi:BPMNShape id="Participant_1_di" bpmnElement="Participant_1" isHorizontal="true">
        <dc:Bounds x="130" y="52" width="750" height="250" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
}

@Component({
  selector: 'app-create-policy-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <div class="dialog-shell">

      <div class="dialog-header">
        <div class="dialog-header__text">
          <span class="dialog-header__title">Nueva politica</span>
          <span class="dialog-header__sub">Define el codigo y nombre del flujo de aprobacion.</span>
        </div>
        <button type="button" class="close-btn" (click)="close()" aria-label="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <form class="dialog-body" (ngSubmit)="submit()" #form="ngForm">

        <div class="field-error" *ngIf="errorMessage()">
          <mat-icon>error_outline</mat-icon>
          {{ errorMessage() }}
        </div>

        <div class="form-field">
          <label class="form-field__label">
            Codigo <span class="form-field__required">*</span>
          </label>
          <input
            class="form-field__input"
            type="text"
            name="code"
            [(ngModel)]="code"
            (ngModelChange)="code = normalizePolicyCode($event)"
            required
            maxlength="60"
            pattern="[A-Z0-9_-]+"
            placeholder="ej: POL-VACACIONES"
            [disabled]="saving()"
          />
          <span class="form-field__hint">Identificador tecnico sin espacios: letras mayusculas, numeros, guiones y guiones bajos.</span>
        </div>

        <div class="form-field">
          <label class="form-field__label">
            Nombre <span class="form-field__required">*</span>
          </label>
          <input
            class="form-field__input"
            type="text"
            name="name"
            [(ngModel)]="name"
            required
            maxlength="120"
            placeholder="ej: Aprobacion de vacaciones"
            [disabled]="saving()"
          />
        </div>

        <div class="form-field">
          <label class="form-field__label">Descripcion</label>
          <textarea
            class="form-field__input"
            name="description"
            [(ngModel)]="description"
            maxlength="500"
            rows="3"
            placeholder="Describe brevemente el proposito de esta politica (opcional)"
            [disabled]="saving()"
          ></textarea>
        </div>

        <div class="dialog-actions">
          <button type="button" mat-stroked-button [disabled]="saving()" (click)="close()">
            Cancelar
          </button>
          <button
            type="submit"
            mat-flat-button
            color="primary"
            [disabled]="saving() || !form.valid"
          >
            <mat-icon>add_circle</mat-icon>
            {{ saving() ? 'Creando...' : 'Crear politica' }}
          </button>
        </div>

      </form>
    </div>
  `,
  styles: [`
    .dialog-shell {
      width: 480px;
      max-width: 100%;
      display: flex;
      flex-direction: column;
    }

    /* Header */
    .dialog-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 20px 20px 16px;
      border-bottom: 1px solid var(--border);
    }

    .dialog-header__text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      min-width: 0;
    }

    .dialog-header__title {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text);
    }

    .dialog-header__sub {
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .close-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: 0;
      cursor: pointer;
      color: var(--text-muted);
      padding: 4px;
      border-radius: 50%;
      transition: background 120ms, color 120ms;
      flex-shrink: 0;
    }

    .close-btn:hover {
      background: var(--surface-hover);
      color: var(--text);
    }

    /* Body */
    .dialog-body {
      display: flex;
      flex-direction: column;
      gap: 18px;
      padding: 20px;
    }

    /* Error */
    .field-error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: var(--danger-soft);
      color: var(--danger);
      font-size: 0.84rem;
      border-radius: var(--radius-sm);
    }

    .field-error mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    /* Fields */
    .form-field {
      display: flex;
      flex-direction: column;
      gap: 5px;
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
      font-family: inherit;
      resize: vertical;
    }

    .form-field__input:focus {
      border-color: var(--accent);
    }

    .form-field__input:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .form-field__hint {
      font-size: 0.76rem;
      color: var(--text-muted);
    }

    /* Actions */
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding-top: 4px;
      border-top: 1px solid var(--border);
      margin-top: 4px;
    }
  `]
})
export class CreatePolicyDialogComponent {
  private readonly workflowApi = inject(WorkflowApiService);
  private readonly router = inject(Router);
  private readonly dialogRef = inject(MatDialogRef<CreatePolicyDialogComponent>);

  protected code = '';
  protected name = '';
  protected description = '';

  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');

  protected close(): void {
    this.dialogRef.close();
  }

  protected submit(): void {
    const code = this.normalizePolicyCode(this.code);
    const name = this.name.trim();

    if (!code || !name) return;
    if (!/^[A-Z0-9_-]+$/.test(code)) {
      this.errorMessage.set('El codigo solo puede contener letras, numeros, guiones y guiones bajos.');
      return;
    }
    if (this.saving()) return;

    this.saving.set(true);
    this.errorMessage.set('');

    this.workflowApi.createWorkflow({
      code,
      name,
      description: this.description.trim() || null,
      bpmnXml: buildInitialBpmn(name)
    }).subscribe({
      next: (workflow) => {
        this.dialogRef.close(true);
        void this.router.navigate(['/design', workflow.id, 'editor']);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(
          err.error?.message || 'No fue posible crear la politica. Intenta de nuevo.'
        );
        this.saving.set(false);
      }
    });
  }

  protected normalizePolicyCode(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9_-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
}
