import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { DynamicForm, FormField } from '../../design/models/dynamic-form.model';
import { WorkflowEditorSnapshot } from '../../design/models/workflow-editor-snapshot.model';
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
          <h1>Iniciar tramite</h1>
          <p>Selecciona una politica publicada, un solicitante y completa el formulario inicial.</p>
        </div>
      </header>

      <div class="alert alert--error" *ngIf="error()">
        <mat-icon>error_outline</mat-icon>
        {{ error() }}
      </div>
      <div class="alert alert--success" *ngIf="success()">
        <mat-icon>check_circle</mat-icon>
        {{ success() }}
      </div>

      <div class="start-grid">
        <form class="panel" (ngSubmit)="start()">
          <div class="empty-form" *ngIf="publishedWorkflows().length === 0">
            <mat-icon>policy</mat-icon>
            <span>No hay politicas publicadas disponibles. Publica una politica valida antes de iniciar un tramite.</span>
          </div>

          <div class="empty-form" *ngIf="applicants().length === 0">
            <mat-icon>person_search</mat-icon>
            <span>No hay solicitantes activos. Crea uno desde la vista de solicitantes.</span>
            <a mat-stroked-button routerLink="/operation/applicants">Crear solicitante</a>
          </div>

          <label class="field">
            <span>Politica publicada</span>
            <select [(ngModel)]="selectedWorkflowId" name="workflow" (ngModelChange)="loadWorkflowSnapshot($event)" required>
              <option value="">Selecciona una politica</option>
              <option *ngFor="let workflow of publishedWorkflows()" [value]="workflow.id">
                {{ workflow.code }} - {{ workflow.name }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>Solicitante</span>
            <select [(ngModel)]="selectedApplicantId" name="applicant" required>
              <option value="">Selecciona un solicitante</option>
              <option *ngFor="let applicant of applicants()" [value]="applicant.id">
                {{ applicantLabel(applicant) }}
              </option>
            </select>
          </label>

          <div class="form-block" *ngIf="initialForm(); else noFormTpl">
            <h2>{{ initialForm()!.title }}</h2>
            <div class="field" *ngFor="let field of initialForm()!.fields">
              <span>{{ field.label }} <b *ngIf="field.required">*</b></span>

              <textarea
                *ngIf="field.type === 'TEXTAREA'"
                rows="4"
                [(ngModel)]="formData[field.name]"
                [name]="field.name"
                [required]="field.required"
              ></textarea>

              <select
                *ngIf="field.type === 'SELECT' || field.type === 'RADIO'"
                [(ngModel)]="formData[field.name]"
                [name]="field.name"
                [required]="field.required"
              >
                <option value="">Selecciona</option>
                <option *ngFor="let option of field.options ?? []" [value]="option">{{ option }}</option>
              </select>

              <div class="checks" *ngIf="field.type === 'MULTISELECT'">
                <label *ngFor="let option of field.options ?? []">
                  <input type="checkbox" (change)="toggleMulti(field.name, option, $any($event.target).checked)" />
                  {{ option }}
                </label>
              </div>

              <label class="checks" *ngIf="field.type === 'CHECKBOX'">
                <input type="checkbox" [(ngModel)]="formData[field.name]" [name]="field.name" />
                {{ field.label }}
              </label>

              <input
                *ngIf="!isSpecialType(field)"
                [type]="inputType(field)"
                [(ngModel)]="formData[field.name]"
                [name]="field.name"
                [required]="field.required"
              />
            </div>
          </div>

          <ng-template #noFormTpl>
            <div class="empty-form">
              <mat-icon>description</mat-icon>
              <span>La primera tarea no tiene formulario inicial asociado.</span>
            </div>
          </ng-template>

          <div class="actions">
            <button mat-flat-button color="primary" type="submit" [disabled]="starting() || !selectedWorkflowId || !selectedApplicantId">
              <mat-icon>play_arrow</mat-icon>
              {{ starting() ? 'Iniciando...' : 'Iniciar tramite' }}
            </button>
          </div>
        </form>

        <aside class="panel panel--compact">
          <h2>Solicitantes</h2>
          <p>El alta de solicitantes tiene datos obligatorios segun si es persona natural o juridica.</p>
          <a mat-flat-button color="primary" routerLink="/operation/applicants">
            <mat-icon>person_add</mat-icon>
            Gestionar solicitantes
          </a>
        </aside>
      </div>
    </section>
  `,
  styles: [`
    .start-page {
      padding: 28px 32px;
      max-width: 1120px;
    }

    .page-header {
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

    .start-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
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

    .panel--compact h2,
    .form-block h2 {
      margin: 0;
      font-size: 0.95rem;
      color: var(--text);
    }

    .panel--compact p {
      margin: 0;
      color: var(--text-muted);
      font-size: 0.84rem;
      line-height: 1.5;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text);
    }

    .field input,
    .field select,
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

    .form-block {
      display: flex;
      flex-direction: column;
      gap: 14px;
      border-top: 1px solid var(--border);
      padding-top: 16px;
    }

    .checks {
      display: grid;
      gap: 8px;
      font-weight: 400;
    }

    .empty-form {
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
      border-top: 1px solid var(--border);
      padding-top: 16px;
    }

    .alert {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-radius: var(--radius-sm);
      margin-bottom: 14px;
      font-size: 0.84rem;
    }

    .alert--error {
      background: var(--danger-soft);
      color: var(--danger);
    }

    .alert--success {
      background: var(--accent-soft);
      color: var(--accent-strong);
    }

    @media (max-width: 900px) {
      .start-grid {
        grid-template-columns: 1fr;
      }
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
  protected readonly snapshot = signal<WorkflowEditorSnapshot | null>(null);
  protected readonly initialForm = signal<DynamicForm | null>(null);
  protected readonly starting = signal(false);
  protected readonly error = signal('');
  protected readonly success = signal('');

  protected selectedWorkflowId = '';
  protected selectedApplicantId = '';
  protected formData: Record<string, unknown> = {};

  ngOnInit(): void {
    this.loadWorkflows();
    this.loadApplicants();
  }

  protected loadWorkflowSnapshot(workflowId: string): void {
    this.snapshot.set(null);
    this.initialForm.set(null);
    this.formData = {};
    if (!workflowId) return;

    this.workflowApi.getEditorSnapshot(workflowId).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (snapshot) => {
        this.snapshot.set(snapshot);
        const firstTask = snapshot.tasks[0];
        const form = firstTask
          ? snapshot.forms.find((item) => item.nodeId === firstTask.nodeId) ?? null
          : null;
        this.initialForm.set(form);
        this.initFormData(form);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message || 'No fue posible cargar la politica.');
      }
    });
  }

  protected start(): void {
    if (!this.selectedWorkflowId || !this.selectedApplicantId || this.starting()) return;
    this.starting.set(true);
    this.error.set('');
    this.success.set('');

    this.proceduresApi.startProcedure({
      workflowDefinitionId: this.selectedWorkflowId,
      applicantId: this.selectedApplicantId,
      formData: this.formData
    }).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (procedure) => {
        this.success.set(`Tramite ${procedure.code} iniciado.`);
        this.starting.set(false);
        void this.router.navigate(['/operation/tasks']);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message || 'No fue posible iniciar el tramite.');
        this.starting.set(false);
      }
    });
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
    const current = Array.isArray(this.formData[key]) ? this.formData[key] as string[] : [];
    this.formData[key] = checked ? [...current, value] : current.filter((item) => item !== value);
  }

  protected applicantLabel(applicant: Applicant): string {
    const displayName = applicant.name
      ?? applicant.businessName
      ?? [applicant.firstName, applicant.lastName].filter(Boolean).join(' ');
    const document = applicant.documentNumber ? ` - ${applicant.documentNumber}` : '';
    return `${displayName || 'Solicitante'}${document}`;
  }

  private loadWorkflows(): void {
    this.workflowApi.getWorkflows().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (workflows) => {
        this.publishedWorkflows.set(workflows.filter((item) => item.status === 'PUBLISHED'));
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message || 'No fue posible cargar las politicas publicadas.');
      }
    });
  }

  private loadApplicants(): void {
    this.applicantsApi.getApplicants().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (applicants) => {
        this.applicants.set(applicants.filter((item) => item.active !== false));
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message || 'No fue posible cargar los solicitantes.');
      }
    });
  }

  private initFormData(form: DynamicForm | null): void {
    this.formData = {};
    form?.fields.forEach((field) => {
      this.formData[field.name] = field.type === 'MULTISELECT' ? [] :
                                  field.type === 'CHECKBOX' ? false : '';
    });
  }
}
