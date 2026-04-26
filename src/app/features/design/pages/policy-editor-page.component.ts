import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, inject, signal
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ApiError } from '../../../core/models/api-error.model';
import { BpmnEditorComponent } from '../components/bpmn-editor/bpmn-editor.component';
import { CollaboratorsPanelComponent } from '../components/collaborators-panel/collaborators-panel.component';
import { FormPanelComponent } from '../components/form-panel/form-panel.component';
import { TasksPanelComponent } from '../components/tasks-panel/tasks-panel.component';
import { WorkflowEditorSnapshot } from '../models/workflow-editor-snapshot.model';
import { WorkflowStatus } from '../models/workflow.model';
import { WorkflowTask } from '../models/workflow-task.model';
import { WorkflowUpdatePayload } from '../models/workflow-payload.model';
import { WorkflowApiService } from '../services/workflow-api.service';

type PanelTab = 'tasks' | 'collaborators';

@Component({
  selector: 'app-policy-editor-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    BpmnEditorComponent,
    TasksPanelComponent,
    FormPanelComponent,
    CollaboratorsPanelComponent
  ],
  template: `
    <div class="editor-layout" *ngIf="!loading() && !errorMessage(); else stateTpl">

      <!-- Toolbar -->
      <header class="editor-toolbar">
        <div class="editor-toolbar__left">
          <a mat-icon-button routerLink="/design" aria-label="Volver">
            <mat-icon>arrow_back</mat-icon>
          </a>
          <div class="editor-toolbar__meta">
            <span class="editor-toolbar__name">{{ snapshot()?.workflow?.name }}</span>
            <span class="status-badge" [ngClass]="statusClass(snapshot()?.workflow?.status)">
              {{ statusLabel(snapshot()?.workflow?.status) }}
            </span>
          </div>
        </div>
        <div class="editor-toolbar__right">
          <button mat-stroked-button [disabled]="saving()" (click)="save()">
            <mat-icon>save</mat-icon>
            {{ saving() ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </header>

      <!-- Body -->
      <div class="editor-body">

        <!-- Canvas -->
        <div class="editor-canvas">
          <app-bpmn-editor
            [xml]="currentXml()"
            (xmlChange)="currentXml.set($event)"
          />
        </div>

        <!-- Panel lateral -->
        <aside class="editor-panel">

          <!-- Tabs -->
          <div class="panel-tabs">
            <button
              class="panel-tab"
              [class.is-active]="activeTab() === 'tasks'"
              (click)="activeTab.set('tasks'); selectedTask.set(null)"
            >
              <mat-icon>pending_actions</mat-icon>
              Tareas
            </button>
            <button
              class="panel-tab"
              [class.is-active]="activeTab() === 'collaborators'"
              (click)="activeTab.set('collaborators')"
            >
              <mat-icon>group</mat-icon>
              Equipo
            </button>
          </div>

          <!-- Contenido del panel -->
          <div class="panel-body">

            <!-- Tab Tareas -->
            <ng-container *ngIf="activeTab() === 'tasks'">
              <app-form-panel
                *ngIf="selectedTask(); else tasksList"
                [task]="selectedTask()!"
                [workflowId]="snapshot()!.workflow.id"
                (back)="selectedTask.set(null)"
                (formUpdated)="onFormUpdated()"
              />
              <ng-template #tasksList>
                <app-tasks-panel
                  [tasks]="snapshot()?.tasks ?? []"
                  [forms]="snapshot()?.forms ?? []"
                  (taskSelected)="selectedTask.set($event)"
                />
              </ng-template>
            </ng-container>

            <!-- Tab Colaboradores -->
            <app-collaborators-panel
              *ngIf="activeTab() === 'collaborators'"
              [workflowId]="snapshot()!.workflow.id"
              [collaborators]="snapshot()?.collaborators ?? []"
              [invitations]="snapshot()?.invitations ?? []"
              (collaboratorAdded)="reloadSnapshot()"
            />

          </div>
        </aside>
      </div>
    </div>

    <!-- Estado carga / error -->
    <ng-template #stateTpl>
      <div class="editor-state">
        <ng-container *ngIf="loading()">
          <mat-icon>hourglass_empty</mat-icon>
          <span>Cargando editor...</span>
        </ng-container>
        <ng-container *ngIf="errorMessage()">
          <mat-icon>error_outline</mat-icon>
          <strong>No se pudo cargar la politica</strong>
          <span>{{ errorMessage() }}</span>
          <a mat-stroked-button routerLink="/design">Volver</a>
        </ng-container>
      </div>
    </ng-template>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }

    .editor-layout {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    /* Toolbar */
    .editor-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 0 16px;
      height: 56px;
      flex-shrink: 0;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      box-shadow: var(--shadow-sm);
    }

    .editor-toolbar__left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .editor-toolbar__meta {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .editor-toolbar__name {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 320px;
    }

    .editor-toolbar__right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    /* Body */
    .editor-body {
      display: flex;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .editor-canvas {
      flex: 1;
      min-width: 0;
      overflow: hidden;
    }

    /* Panel lateral */
    .editor-panel {
      width: 300px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      border-left: 1px solid var(--border);
      background: var(--surface);
      overflow: hidden;
    }

    .panel-tabs {
      display: flex;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }

    .panel-tab {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      flex: 1;
      padding: 10px 8px;
      border: 0;
      border-bottom: 2px solid transparent;
      background: transparent;
      color: var(--text-muted);
      font-size: 0.82rem;
      font-weight: 500;
      cursor: pointer;
      transition: color 120ms ease, border-color 120ms ease;
    }

    .panel-tab mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .panel-tab:hover {
      color: var(--text);
    }

    .panel-tab.is-active {
      color: var(--accent-strong);
      border-bottom-color: var(--accent);
      font-weight: 600;
    }

    .panel-body {
      flex: 1;
      overflow-y: auto;
      padding: 14px 0;
    }

    /* Status badge */
    .status-badge {
      display: inline-flex;
      align-items: center;
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.03em;
      padding: 2px 8px;
      border-radius: 999px;
      text-transform: uppercase;
      flex-shrink: 0;
    }

    .status-badge--draft {
      background: rgba(180, 83, 9, 0.1);
      color: var(--warning);
    }

    .status-badge--published {
      background: var(--accent-soft);
      color: var(--accent-strong);
    }

    .status-badge--archived {
      background: var(--surface-3);
      color: var(--text-muted);
    }

    /* Estado carga/error */
    .editor-state {
      display: grid;
      place-items: center;
      gap: 10px;
      height: 100vh;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.86rem;
    }

    .editor-state mat-icon {
      width: 32px;
      height: 32px;
      font-size: 32px;
      color: var(--text-subtle);
    }

    .editor-state strong {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text);
    }
  `]
})
export class PolicyEditorPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly workflowApi = inject(WorkflowApiService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly saving = signal(false);
  protected readonly snapshot = signal<WorkflowEditorSnapshot | null>(null);
  protected readonly currentXml = signal('');
  protected readonly activeTab = signal<PanelTab>('tasks');
  protected readonly selectedTask = signal<WorkflowTask | null>(null);

  private readonly workflowId: string;

  constructor() {
    this.workflowId = this.route.snapshot.paramMap.get('id') ?? '';
    this.loadSnapshot();
  }

  protected save(): void {
    const snap = this.snapshot();
    if (!snap || this.saving()) return;

    this.saving.set(true);

    const payload: WorkflowUpdatePayload = {
      name: snap.workflow.name,
      description: snap.workflow.description,
      bpmnXml: this.currentXml()
    };

    this.workflowApi.updateWorkflow(snap.workflow.id, payload).subscribe({
      next: () => this.saving.set(false),
      error: (error: HttpErrorResponse) => {
        const apiError = error.error as Partial<ApiError> | null;
        this.errorMessage.set(apiError?.message || 'No fue posible guardar los cambios.');
        this.saving.set(false);
      }
    });
  }

  protected reloadSnapshot(): void {
    this.loadSnapshot();
  }

  protected onFormUpdated(): void {
    this.loadSnapshot();
    this.selectedTask.set(null);
  }

  protected statusLabel(status: WorkflowStatus | undefined): string {
    if (!status) return '';
    const labels: Record<WorkflowStatus, string> = {
      DRAFT: 'Borrador', PUBLISHED: 'Publicada', ARCHIVED: 'Archivada'
    };
    return labels[status] ?? status;
  }

  protected statusClass(status: WorkflowStatus | undefined): string {
    if (!status) return '';
    const classes: Record<WorkflowStatus, string> = {
      DRAFT: 'status-badge--draft',
      PUBLISHED: 'status-badge--published',
      ARCHIVED: 'status-badge--archived'
    };
    return classes[status] ?? '';
  }

  private loadSnapshot(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.workflowApi.getEditorSnapshot(this.workflowId).subscribe({
      next: (snapshot) => {
        this.snapshot.set(snapshot);
        if (!this.currentXml()) {
          this.currentXml.set(snapshot.workflow.draftBpmnXml);
        }
      },
      error: (error: HttpErrorResponse) => {
        const apiError = error.error as Partial<ApiError> | null;
        this.errorMessage.set(apiError?.message || 'No fue posible cargar la politica.');
        this.loading.set(false);
      },
      complete: () => this.loading.set(false)
    });
  }
}
