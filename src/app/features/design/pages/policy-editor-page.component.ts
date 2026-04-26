import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ApiError } from '../../../core/models/api-error.model';
import { BpmnEditorComponent } from '../components/bpmn-editor/bpmn-editor.component';
import { WorkflowEditorSnapshot } from '../models/workflow-editor-snapshot.model';
import { WorkflowStatus } from '../models/workflow.model';
import { WorkflowApiService } from '../services/workflow-api.service';
import { WorkflowUpdatePayload } from '../models/workflow-payload.model';

@Component({
  selector: 'app-policy-editor-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    BpmnEditorComponent
  ],
  template: `
    <div class="editor-layout" *ngIf="!loading() && !errorMessage(); else stateTpl">
      <header class="editor-toolbar">
        <div class="editor-toolbar__left">
          <a mat-icon-button routerLink="/design" aria-label="Volver a politicas">
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
          <button
            mat-stroked-button
            [disabled]="saving()"
            (click)="save()"
          >
            <mat-icon>save</mat-icon>
            {{ saving() ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </header>

      <main class="editor-main">
        <app-bpmn-editor
          [xml]="currentXml()"
          (xmlChange)="currentXml.set($event)"
        />
      </main>
    </div>

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
      min-width: 0;
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

    .editor-main {
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

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

  constructor() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.loadSnapshot(id);
  }

  protected save(): void {
    const snap = this.snapshot();
    if (!snap || this.saving()) {
      return;
    }

    this.saving.set(true);

    const payload: WorkflowUpdatePayload = {
      name: snap.workflow.name,
      description: snap.workflow.description,
      bpmnXml: this.currentXml()
    };

    this.workflowApi.updateWorkflow(snap.workflow.id, payload).subscribe({
      next: () => {
        this.saving.set(false);
      },
      error: (error: HttpErrorResponse) => {
        const apiError = error.error as Partial<ApiError> | null;
        this.errorMessage.set(apiError?.message || 'No fue posible guardar los cambios.');
        this.saving.set(false);
      }
    });
  }

  protected statusLabel(status: WorkflowStatus | undefined): string {
    if (!status) return '';
    const labels: Record<WorkflowStatus, string> = {
      DRAFT: 'Borrador',
      PUBLISHED: 'Publicada',
      ARCHIVED: 'Archivada'
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

  private loadSnapshot(id: string): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.workflowApi.getEditorSnapshot(id).subscribe({
      next: (snapshot) => {
        this.snapshot.set(snapshot);
        this.currentXml.set(snapshot.workflow.draftBpmnXml);
      },
      error: (error: HttpErrorResponse) => {
        const apiError = error.error as Partial<ApiError> | null;
        this.errorMessage.set(apiError?.message || 'No fue posible cargar la politica.');
        this.loading.set(false);
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }
}
