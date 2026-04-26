import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { DynamicForm } from '../../models/dynamic-form.model';
import { WorkflowTask } from '../../models/workflow-task.model';

@Component({
  selector: 'app-tasks-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="panel-section-title">Tareas del proceso</div>

    <div class="task-empty" *ngIf="tasks.length === 0">
      <mat-icon>pending_actions</mat-icon>
      <span>Sin tareas detectadas. Agrega user tasks al diagrama.</span>
    </div>

    <ul class="task-list" *ngIf="tasks.length > 0">
      <li
        *ngFor="let task of tasks"
        class="task-item"
        (click)="taskSelected.emit(task)"
      >
        <div class="task-item__info">
          <span class="task-item__name">{{ task.nodeName }}</span>
          <span class="task-item__dept">{{ task.departmentName || task.departmentCode }}</span>
        </div>
        <div class="task-item__right">
          <span class="form-badge form-badge--set" *ngIf="hasForm(task); else noForm">
            <mat-icon>check_circle</mat-icon>
            Formulario
          </span>
          <ng-template #noForm>
            <span class="form-badge form-badge--unset">
              <mat-icon>radio_button_unchecked</mat-icon>
              Sin form
            </span>
          </ng-template>
          <mat-icon class="task-item__arrow">chevron_right</mat-icon>
        </div>
      </li>
    </ul>
  `,
  styles: [`
    .panel-section-title {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-muted);
      padding: 0 16px 10px;
    }

    .task-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 32px 16px;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.82rem;
    }

    .task-empty mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: var(--text-subtle);
    }

    .task-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .task-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 10px 16px;
      cursor: pointer;
      border-radius: var(--radius-sm);
      transition: background 120ms ease;
    }

    .task-item:hover {
      background: var(--surface-hover);
    }

    .task-item__info {
      display: flex;
      flex-direction: column;
      min-width: 0;
      gap: 2px;
    }

    .task-item__name {
      font-size: 0.86rem;
      font-weight: 600;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .task-item__dept {
      font-size: 0.76rem;
      color: var(--text-muted);
    }

    .task-item__right {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .form-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 0.72rem;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 999px;
    }

    .form-badge mat-icon {
      font-size: 13px;
      width: 13px;
      height: 13px;
    }

    .form-badge--set {
      background: var(--accent-soft);
      color: var(--accent-strong);
    }

    .form-badge--unset {
      background: var(--surface-3);
      color: var(--text-muted);
    }

    .task-item__arrow {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--text-subtle);
    }
  `]
})
export class TasksPanelComponent {
  @Input() tasks: WorkflowTask[] = [];
  @Input() forms: DynamicForm[] = [];

  @Output() readonly taskSelected = new EventEmitter<WorkflowTask>();

  protected hasForm(task: WorkflowTask): boolean {
    return task.formId !== null || this.forms.some((f) => f.nodeId === task.nodeId);
  }
}
