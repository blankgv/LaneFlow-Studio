import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit, ViewChild, inject, signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { ApiError } from '../../../core/models/api-error.model';
import { AuthSessionService } from '../../auth/services/auth-session.service';
import { BpmnEditorComponent } from '../components/bpmn-editor/bpmn-editor.component';
import { FormPanelComponent } from '../components/form-panel/form-panel.component';
import { PresenceIndicatorComponent } from '../components/presence-indicator/presence-indicator.component';
import { TasksPanelComponent } from '../components/tasks-panel/tasks-panel.component';
import { WorkflowEditorSnapshot } from '../models/workflow-editor-snapshot.model';
import { WorkflowStatus } from '../models/workflow.model';
import { WorkflowTask } from '../models/workflow-task.model';
import { WorkflowUpdatePayload } from '../models/workflow-payload.model';
import { WorkflowVersion } from '../models/workflow-version.model';
import { CollaborationSession, WorkflowCollaborationService } from '../services/workflow-collaboration.service';
import { WorkflowApiService } from '../services/workflow-api.service';

type PanelTab = 'tasks' | 'history';
type SaveState = 'saved' | 'saving' | 'pending' | 'error';

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
    PresenceIndicatorComponent
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

        <app-presence-indicator [session]="collaboration" />

        <div class="editor-toolbar__right">
          <!-- Indicador autosave -->
          <span class="save-indicator" [ngClass]="'save-indicator--' + saveState()">
            <mat-icon>{{ saveStateIcon() }}</mat-icon>
            {{ saveStateLabel() }}
          </span>

          <button mat-stroked-button [disabled]="saveState() === 'saving'" (click)="save()">
            <mat-icon>save</mat-icon>
            Guardar
          </button>

          <button
            *ngIf="canPublish()"
            mat-flat-button
            color="primary"
            [disabled]="publishing()"
            (click)="publish()"
          >
            <mat-icon>publish</mat-icon>
            {{ publishing() ? 'Publicando...' : 'Publicar' }}
          </button>
        </div>
      </header>

      <!-- Error de publicacion -->
      <div class="publish-error" *ngIf="publishError()">
        <mat-icon>error_outline</mat-icon>
        {{ publishError() }}
        <button type="button" class="publish-error__close" (click)="publishError.set('')">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Body -->
      <div class="editor-body">

        <!-- Canvas -->
        <div class="editor-canvas">
          <app-bpmn-editor
            [xml]="currentXml()"
            (xmlChange)="onXmlChange($event)"
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
              [class.is-active]="activeTab() === 'history'"
              (click)="switchToHistory()"
            >
              <mat-icon>history</mat-icon>
              Historial
            </button>
          </div>

          <!-- Tareas -->
          <div class="panel-body" *ngIf="activeTab() === 'tasks'">
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
          </div>

          <!-- Historial -->
          <div class="panel-body" *ngIf="activeTab() === 'history'">

            <div class="history-loading" *ngIf="loadingHistory()">
              <mat-icon>hourglass_empty</mat-icon>
              <span>Cargando historial...</span>
            </div>

            <div class="history-empty" *ngIf="!loadingHistory() && versions().length === 0">
              <mat-icon>history</mat-icon>
              <span>Sin versiones publicadas aun.</span>
            </div>

            <ul class="version-list" *ngIf="!loadingHistory() && versions().length > 0">
              <li *ngFor="let v of versions()" class="version-item">
                <div class="version-item__info">
                  <span class="version-item__num">v{{ v.versionNumber }}</span>
                  <span class="version-item__date">{{ v.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
                  <span class="version-item__by">{{ v.createdBy }}</span>
                </div>
                <div class="version-item__badges">
                  <span class="pub-badge" *ngIf="v.publishedAt">Publicada</span>
                </div>
                <button
                  mat-icon-button
                  class="version-item__load"
                  (click)="loadVersion(v)"
                  aria-label="Cargar esta version"
                  title="Cargar esta version en el editor"
                >
                  <mat-icon>file_open</mat-icon>
                </button>
              </li>
            </ul>

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

    /* Save indicator */
    .save-indicator {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.78rem;
      font-weight: 500;
      padding: 3px 8px;
      border-radius: 999px;
    }

    .save-indicator mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .save-indicator--saved {
      color: var(--accent-strong);
      background: var(--accent-soft);
    }

    .save-indicator--saving {
      color: var(--text-muted);
      background: var(--surface-2);
    }

    .save-indicator--pending {
      color: var(--warning);
      background: rgba(180, 83, 9, 0.1);
    }

    .save-indicator--error {
      color: var(--danger);
      background: var(--danger-soft);
    }

    /* Publish error bar */
    .publish-error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: var(--danger-soft);
      color: var(--danger);
      font-size: 0.84rem;
      border-bottom: 1px solid rgba(185,28,28,0.18);
      flex-shrink: 0;
    }

    .publish-error mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    .publish-error__close {
      margin-left: auto;
      display: inline-flex;
      align-items: center;
      background: transparent;
      border: 0;
      cursor: pointer;
      color: var(--danger);
      padding: 0;
    }

    .publish-error__close mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
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

    .panel-tab:hover { color: var(--text); }

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

    /* Historial */
    .history-loading,
    .history-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 32px 16px;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.82rem;
    }

    .history-loading mat-icon,
    .history-empty mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: var(--text-subtle);
    }

    .version-list {
      list-style: none;
      margin: 0;
      padding: 0 0 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .version-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border-radius: var(--radius-sm);
      transition: background 120ms ease;
    }

    .version-item:hover { background: var(--surface-hover); }

    .version-item__info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      min-width: 0;
    }

    .version-item__num {
      font-size: 0.86rem;
      font-weight: 700;
      color: var(--text);
    }

    .version-item__date {
      font-size: 0.74rem;
      color: var(--text-muted);
    }

    .version-item__by {
      font-size: 0.74rem;
      color: var(--text-subtle);
    }

    .version-item__badges {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex-shrink: 0;
    }

    .pub-badge {
      font-size: 0.68rem;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent-strong);
    }

    .version-item__load {
      flex-shrink: 0;
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
export class PolicyEditorPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly workflowApi = inject(WorkflowApiService);
  private readonly collaborationService = inject(WorkflowCollaborationService);
  private readonly authSession = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly saveState = signal<SaveState>('saved');
  protected readonly publishing = signal(false);
  protected readonly publishError = signal('');
  protected readonly snapshot = signal<WorkflowEditorSnapshot | null>(null);
  protected readonly currentXml = signal('');
  protected readonly activeTab = signal<PanelTab>('tasks');
  protected readonly selectedTask = signal<WorkflowTask | null>(null);
  protected readonly versions = signal<WorkflowVersion[]>([]);
  protected readonly loadingHistory = signal(false);

  protected collaboration: CollaborationSession | null = null;

  @ViewChild(BpmnEditorComponent) private bpmnEditor?: BpmnEditorComponent;

  private readonly workflowId: string;
  private readonly xmlChange$ = new Subject<string>();

  constructor() {
    this.workflowId = this.route.snapshot.paramMap.get('id') ?? '';
  }

  ngOnInit(): void {
    this.loadSnapshot();

    this.collaboration = this.collaborationService.connect(this.workflowId);

    this.collaboration?.draft$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((sync) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = sync as any;
      const xml: string = raw['bpmnXml'] ?? raw['xml'] ?? raw['bpmn_xml'] ?? '';

      if (!xml || xml === this.currentXml()) return;

      this.currentXml.set(xml);

      if (this.bpmnEditor) {
        this.bpmnEditor.applyRemoteXml(xml);
      } else {
        setTimeout(() => this.bpmnEditor?.applyRemoteXml(xml), 0);
      }

      this.refreshSnapshot();
    });

    this.xmlChange$.pipe(
      debounceTime(2000),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => this.save());
  }

  ngOnDestroy(): void {
    this.collaboration?.disconnect();
  }

  protected onXmlChange(xml: string): void {
    this.currentXml.set(xml);
    this.saveState.set('pending');
    this.collaboration?.publishDraft(xml);
    this.xmlChange$.next(xml);
  }

  protected save(): void {
    const snap = this.snapshot();
    if (!snap || this.saveState() === 'saving') return;

    this.saveState.set('saving');

    const payload: WorkflowUpdatePayload = {
      name: snap.workflow.name,
      description: snap.workflow.description,
      bpmnXml: this.currentXml()
    };

    this.workflowApi.updateWorkflow(snap.workflow.id, payload).subscribe({
      next: () => {
        this.saveState.set('saved');
      },
      error: () => this.saveState.set('error')
    });
  }

  protected publish(): void {
    const snap = this.snapshot();
    if (!snap || this.publishing()) return;

    this.publishing.set(true);
    this.publishError.set('');

    this.workflowApi.validateWorkflow(snap.workflow.id).subscribe({
      next: () => {
        this.workflowApi.publishWorkflow(snap.workflow.id).subscribe({
          next: (updated) => {
            this.snapshot.update((s) => s ? { ...s, workflow: updated } : s);
            this.publishing.set(false);
          },
          error: (error: HttpErrorResponse) => {
            const apiError = error.error as Partial<ApiError> | null;
            this.publishError.set(apiError?.message || 'No fue posible publicar la politica.');
            this.publishing.set(false);
          }
        });
      },
      error: (error: HttpErrorResponse) => {
        const apiError = error.error as Partial<ApiError> | null;
        this.publishError.set(apiError?.message || 'La politica no paso la validacion.');
        this.publishing.set(false);
      }
    });
  }

  protected canPublish(): boolean {
    const snap = this.snapshot();
    return !!snap?.canEdit && snap.workflow.status === 'DRAFT';
  }

  protected switchToHistory(): void {
    this.activeTab.set('history');
    if (this.versions().length === 0) {
      this.loadVersions();
    }
  }

  protected loadVersion(version: WorkflowVersion): void {
    this.currentXml.set(version.bpmnXml);
    this.saveState.set('pending');
    this.activeTab.set('tasks');
  }

  protected onFormUpdated(): void {
    this.loadSnapshot();
    this.selectedTask.set(null);
  }

  protected saveStateIcon(): string {
    const icons: Record<SaveState, string> = {
      saved: 'check_circle',
      saving: 'sync',
      pending: 'edit',
      error: 'error_outline'
    };
    return icons[this.saveState()];
  }

  protected saveStateLabel(): string {
    const labels: Record<SaveState, string> = {
      saved: 'Guardado',
      saving: 'Guardando...',
      pending: 'Sin guardar',
      error: 'Error al guardar'
    };
    return labels[this.saveState()];
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

  private refreshSnapshot(): void {
    this.workflowApi.getEditorSnapshot(this.workflowId).subscribe({
      next: (snapshot) => this.snapshot.set(snapshot),
      error: () => {}
    });
  }

  private loadSnapshot(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.workflowApi.getEditorSnapshot(this.workflowId).subscribe({
      next: (snapshot) => {
        this.snapshot.set(snapshot);
        if (!this.currentXml()) {
          this.currentXml.set(snapshot.workflow.draftBpmnXml);
          this.saveState.set('saved');
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

  private loadVersions(): void {
    this.loadingHistory.set(true);

    this.workflowApi.getVersions(this.workflowId).subscribe({
      next: (list) => {
        this.versions.set(list.slice().reverse());
        this.loadingHistory.set(false);
      },
      error: () => this.loadingHistory.set(false)
    });
  }
}
