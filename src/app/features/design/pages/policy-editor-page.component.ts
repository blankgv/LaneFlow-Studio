import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit, ViewChild, inject, signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { ApiError } from '../../../core/models/api-error.model';
import { DepartmentOption } from '../../admin/models/department-option.model';
import { AuthSessionService } from '../../auth/services/auth-session.service';
import { AssignDepartmentDialogComponent } from '../components/assign-department-dialog/assign-department-dialog.component';
import { BpmnEditorComponent, BpmnValidationSummary, LaneAddedEvent, LaneInsertRequest, SelectedFlowElement } from '../components/bpmn-editor/bpmn-editor.component';
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
    MatDialogModule,
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
            <span class="readonly-badge" *ngIf="snapshot() && !snapshot()!.canEdit">
              <mat-icon>lock</mat-icon>
              Solo lectura
            </span>
          </div>
        </div>

        <app-presence-indicator [session]="collaboration" />

        <div class="editor-toolbar__right" *ngIf="snapshot()?.canEdit">

          <!-- Política publicada: solo botón nuevo borrador -->
          <ng-container *ngIf="snapshot()?.workflow?.status === 'PUBLISHED'; else draftActions">
            <button
              mat-flat-button
              color="primary"
              [disabled]="creatingDraft()"
              (click)="createDraft()"
            >
              <mat-icon>edit_note</mat-icon>
              {{ creatingDraft() ? 'Creando...' : 'Nuevo borrador' }}
            </button>
          </ng-container>

          <!-- Política en borrador: guardar + publicar -->
          <ng-template #draftActions>
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
          </ng-template>

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

      <!-- Advertencia estructural (no bloqueante) -->
      <div class="bpmn-warning" *ngIf="bpmnWarning()">
        <mat-icon>warning_amber</mat-icon>
        {{ bpmnWarning() }}
        <button type="button" class="publish-error__close" (click)="bpmnWarning.set('')">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Body -->
      <div class="editor-body">

        <!-- Canvas -->
        <div class="editor-canvas">
          <app-bpmn-editor
            [xml]="currentXml()"
            [readonly]="!snapshot()?.canEdit"
            (xmlChange)="onXmlChange($event)"
            (flowSelected)="onFlowSelected($event)"
            (laneAdded)="onLaneAdded($event)"
            (laneInsertRequested)="onLaneInsertRequested($event)"
            (poolCreated)="onPoolCreated($event)"
            (multiplePoolsBlocked)="onMultiplePoolsBlocked()"
            (taskOutsideLane)="onTaskOutsideLane()"
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

          <!-- Editor de condición (sobrescribe el panel cuando hay un flujo seleccionado) -->
          <div class="panel-body" *ngIf="selectedFlow(); else normalPanel">
            <div class="condition-editor">
              <div class="condition-editor__header">
                <mat-icon>device_hub</mat-icon>
                <span>Condición del flujo</span>
                <button class="condition-editor__close" type="button" (click)="selectedFlow.set(null)">
                  <mat-icon>close</mat-icon>
                </button>
              </div>

              <div class="condition-editor__body">
                <label class="condition-editor__label">Expresión de condición</label>
                <textarea
                  class="condition-editor__input"
                  rows="5"
                  [placeholder]="conditionPlaceholder"
                  [value]="conditionDraft()"
                  (input)="conditionDraft.set($any($event.target).value)"
                ></textarea>
                <p class="condition-editor__hint">
                  Usa expresiones EL de Camunda.<br>
                  Ejemplo: <code>&#36;&#123;variable == valor&#125;</code>
                </p>
              </div>

              <div class="condition-editor__actions">
                <button mat-stroked-button type="button" (click)="selectedFlow.set(null)">
                  Cancelar
                </button>
                <button mat-flat-button color="primary" type="button" (click)="applyCondition()">
                  <mat-icon>check</mat-icon>
                  Aplicar
                </button>
              </div>
            </div>
          </div>

          <!-- Tareas / Historial (panel normal) -->
          <ng-template #normalPanel>

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

          </ng-template>

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

    .readonly-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.72rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 999px;
      background: var(--surface-3);
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .readonly-badge mat-icon {
      font-size: 12px;
      width: 12px;
      height: 12px;
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

    /* Editor de condición */
    .condition-editor {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 0;
    }

    .condition-editor__header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 16px 12px;
      border-bottom: 1px solid var(--border);
      font-size: 0.86rem;
      font-weight: 600;
      color: var(--text);
      flex-shrink: 0;
    }

    .condition-editor__header mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--accent-strong);
    }

    .condition-editor__close {
      margin-left: auto;
      display: inline-flex;
      align-items: center;
      background: transparent;
      border: 0;
      cursor: pointer;
      color: var(--text-muted);
      padding: 2px;
      border-radius: 4px;
      transition: color 120ms;
    }

    .condition-editor__close:hover { color: var(--text); }

    .condition-editor__close mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .condition-editor__body {
      flex: 1;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .condition-editor__label {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .condition-editor__input {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface-2);
      color: var(--text);
      font-family: 'Courier New', monospace;
      font-size: 0.84rem;
      resize: vertical;
      transition: border-color 150ms;
      outline: none;
    }

    .condition-editor__input:focus {
      border-color: var(--accent);
    }

    .condition-editor__hint {
      font-size: 0.74rem;
      color: var(--text-muted);
      line-height: 1.5;
      margin: 0;
    }

    .condition-editor__hint code {
      background: var(--surface-3);
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 0.78rem;
      color: var(--accent-strong);
    }

    .condition-editor__actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      padding: 12px 16px;
      border-top: 1px solid var(--border);
      flex-shrink: 0;
    }

    /* Advertencia estructural */
    .bpmn-warning {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: rgba(180, 83, 9, 0.08);
      color: var(--warning);
      font-size: 0.82rem;
      flex-shrink: 0;
      border-bottom: 1px solid rgba(180, 83, 9, 0.2);
    }

    .bpmn-warning mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
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
  private readonly dialog = inject(MatDialog);

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
  protected readonly selectedFlow = signal<SelectedFlowElement | null>(null);
  protected readonly conditionDraft = signal('');
  protected readonly creatingDraft = signal(false);
  protected readonly bpmnWarning = signal('');

  protected collaboration: CollaborationSession | null = null;
  protected readonly conditionPlaceholder = 'ej: ${aprobado == true}';

  @ViewChild(BpmnEditorComponent) private bpmnEditor?: BpmnEditorComponent;

  private readonly workflowId: string;
  private readonly xmlChange$ = new Subject<string>();

  constructor() {
    this.workflowId = this.route.snapshot.paramMap.get('id') ?? '';
  }

  ngOnInit(): void {
    this.loadSnapshot();

    this.collaboration = this.collaborationService.connect(this.workflowId);

    const myUsername = this.authSession.session()?.username;

    this.collaboration?.draft$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((sync) => {
      // Ignorar mensajes propios
      if (sync.lastModifiedBy && sync.lastModifiedBy === myUsername) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = sync as any;
      const xml: string = raw['bpmnXml'] ?? raw['xml'] ?? raw['bpmn_xml'] ?? '';

      if (!xml) return;

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
        this.refreshSnapshot();
      },
      error: (err: HttpErrorResponse) => {
        // 409 = conflicto de concurrencia con WebSocket draft.save
        // Los datos ya se guardaron via WebSocket, no es un error real
        if (err.status === 409) {
          this.saveState.set('saved');
          this.refreshSnapshot();
        } else {
          this.saveState.set('error');
        }
      }
    });
  }

  protected publish(): void {
    const snap = this.snapshot();
    if (!snap || this.publishing()) return;

    // ── Pre-validación estructural del BPMN ────────────────────────────────
    const error = this.validateBpmnStructure(snap);
    if (error) {
      this.publishError.set(error);
      return;
    }

    this.publishing.set(true);
    this.publishError.set('');

    this.workflowApi.validateWorkflow(snap.workflow.id).subscribe({
      next: () => {
        this.workflowApi.publishWorkflow(snap.workflow.id).subscribe({
          next: (updated) => {
            this.snapshot.update((s) => s ? { ...s, workflow: updated } : s);
            this.publishing.set(false);
          },
          error: (err: HttpErrorResponse) => {
            const apiError = err.error as Partial<ApiError> | null;
            this.publishError.set(apiError?.message || 'No fue posible publicar la politica.');
            this.publishing.set(false);
          }
        });
      },
      error: (err: HttpErrorResponse) => {
        const apiError = err.error as Partial<ApiError> | null;
        this.publishError.set(apiError?.message || 'La politica no paso la validacion.');
        this.publishing.set(false);
      }
    });
  }

  /** Valida la estructura BPMN antes de publicar. Retorna mensaje de error o null si es válido. */
  private validateBpmnStructure(snap: NonNullable<ReturnType<typeof this.snapshot>>): string | null {
    // Validación desde snapshot (backend): tasks sin lane
    const tasksWithoutLane = snap.tasks.filter((t) => !t.swimlaneId);
    if (tasksWithoutLane.length > 0) {
      const names = tasksWithoutLane.map((t) => t.nodeName || t.nodeId).join(', ');
      return `Las siguientes tareas no tienen lane asignada: ${names}.`;
    }

    // Validación estructural del canvas (si el editor está activo)
    if (!this.bpmnEditor) return null;
    const summary: BpmnValidationSummary = this.bpmnEditor.getValidationSummary();

    if (summary.pools > 1) {
      return 'El diagrama tiene más de un pool. Solo se permite un pool por política.';
    }

    if (summary.lanes.length === 0) {
      return 'El diagrama no tiene ninguna lane. Agrega al menos una lane con departamento asignado.';
    }

    const lanesWithoutDept = summary.lanes.filter((l) => !l.name.trim());
    if (lanesWithoutDept.length > 0) {
      return `Hay ${lanesWithoutDept.length} lane(s) sin departamento asignado. Asigna un departamento a cada lane antes de publicar.`;
    }

    if (summary.tasksOutsideLane > 0) {
      return `Hay ${summary.tasksOutsideLane} tarea(s) fuera de una lane. Todas las tareas deben estar dentro de una lane.`;
    }

    return null;
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

  protected onFlowSelected(flow: SelectedFlowElement | null): void {
    this.selectedFlow.set(flow);
    this.conditionDraft.set(flow?.condition ?? '');
  }

  protected onPoolCreated(poolId: string): void {
    const ref = this.dialog.open(AssignDepartmentDialogComponent, {
      data: { elementId: poolId, elementType: 'pool' } as LaneAddedEvent,
      disableClose: true,
      panelClass: 'assign-dept-dialog-panel'
    });

    ref.afterClosed().subscribe((dept: DepartmentOption | null) => {
      if (!this.bpmnEditor) return;
      if (!dept) {
        this.bpmnEditor.removeElement(poolId);
        return;
      }
      // El pool siempre lleva el nombre de la política, no del departamento
      const policyName = this.snapshot()?.workflow.name ?? '';
      this.bpmnEditor.setElementName(poolId, policyName);
      // Si el usuario eligió dept, crear el primer lane con ese código
      this.bpmnEditor.addLaneToPool(poolId, dept.code);
    });
  }

  protected onMultiplePoolsBlocked(): void {
    this.bpmnWarning.set(
      'Solo se permite un pool por política. El pool adicional fue eliminado automáticamente.'
    );
  }

  protected onTaskOutsideLane(): void {
    this.bpmnWarning.set(
      'Una tarea fue colocada fuera de una lane. Muévela dentro de una lane de departamento antes de publicar.'
    );
  }

  protected onLaneInsertRequested(request: LaneInsertRequest): void {
    const ref = this.dialog.open(AssignDepartmentDialogComponent, {
      data: { elementId: request.targetElementId, elementType: 'lane' } as LaneAddedEvent,
      disableClose: true,
      panelClass: 'assign-dept-dialog-panel'
    });

    ref.afterClosed().subscribe((dept: DepartmentOption | null) => {
      if (!this.bpmnEditor || !dept) return;
      this.bpmnEditor.addLaneNear(request.targetElementId, request.location, dept.code);
    });
  }

  protected onLaneAdded(event: LaneAddedEvent): void {
    const ref = this.dialog.open(AssignDepartmentDialogComponent, {
      data: event,
      disableClose: true,
      panelClass: 'assign-dept-dialog-panel'
    });

    ref.afterClosed().subscribe((dept: DepartmentOption | null) => {
      if (!this.bpmnEditor) return;
      if (dept) {
        this.bpmnEditor.setElementName(event.elementId, dept.code);
      }
      // Si omitió: la lane queda sin nombre (el editor ya limpió la lane resto de bpmn-js).
      // La validación pre-publicación bloquea lanes sin departamento.
    });
  }

  protected createDraft(): void {
    const snap = this.snapshot();
    if (!snap || this.creatingDraft()) return;

    this.creatingDraft.set(true);
    this.publishError.set('');

    const payload: WorkflowUpdatePayload = {
      name: snap.workflow.name,
      description: snap.workflow.description,
      bpmnXml: this.currentXml()
    };

    this.workflowApi.updateWorkflow(snap.workflow.id, payload).subscribe({
      next: () => {
        this.creatingDraft.set(false);
        this.saveState.set('saved');
        this.refreshSnapshot();
      },
      error: (err: HttpErrorResponse) => {
        const apiError = err.error as Partial<ApiError> | null;
        this.publishError.set(
          apiError?.message || 'No fue posible crear el nuevo borrador.'
        );
        this.creatingDraft.set(false);
      }
    });
  }

  protected applyCondition(): void {
    const flow = this.selectedFlow();
    if (!flow || !this.bpmnEditor) return;
    this.bpmnEditor.setCondition(flow.id, this.conditionDraft());
    this.selectedFlow.set(null);
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
        // Sincronizar nombre del pool con el nombre de la política
        // (setTimeout porque el editor puede no estar listo aún en el primer ciclo)
        setTimeout(() => {
          this.bpmnEditor?.syncPoolName(snapshot.workflow.name);
        }, 300);
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
