import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { TaskInstance } from '../models/task-instance.model';
import { TasksApiService } from '../services/tasks-api.service';

type Tab = 'available' | 'mine';

@Component({
  selector: 'app-tasks-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="tasks-page">

      <header class="tasks-header">
        <div class="tasks-header__title">
          <mat-icon>assignment</mat-icon>
          <h1>Tareas</h1>
        </div>
      </header>

      <!-- Tabs -->
      <div class="tasks-tabs">
        <button
          class="tasks-tab"
          [class.is-active]="activeTab() === 'available'"
          (click)="switchTab('available')"
        >
          <mat-icon>inbox</mat-icon>
          Disponibles
          <span class="tab-count" *ngIf="available().length > 0">{{ available().length }}</span>
        </button>
        <button
          class="tasks-tab"
          [class.is-active]="activeTab() === 'mine'"
          (click)="switchTab('mine')"
        >
          <mat-icon>assignment_ind</mat-icon>
          Mis Tareas
          <span class="tab-count" *ngIf="mine().length > 0">{{ mine().length }}</span>
        </button>
      </div>

      <!-- Estado carga -->
      <div class="tasks-state" *ngIf="loading()">
        <mat-icon>hourglass_empty</mat-icon>
        <span>Cargando tareas...</span>
      </div>

      <!-- Estado error -->
      <div class="tasks-state tasks-state--error" *ngIf="!loading() && error()">
        <mat-icon>error_outline</mat-icon>
        <span>{{ error() }}</span>
        <button mat-stroked-button (click)="reload()">Reintentar</button>
      </div>

      <!-- Lista disponibles -->
      <div class="tasks-list" *ngIf="!loading() && !error() && activeTab() === 'available'">

        <div class="tasks-empty" *ngIf="available().length === 0">
          <mat-icon>inbox</mat-icon>
          <strong>No hay tareas disponibles</strong>
          <span>Las tareas apareceran aqui cuando exista un tramite iniciado y una tarea pendiente para tu departamento.</span>
        </div>

        <div class="task-card" *ngFor="let task of available()">
          <div class="task-card__body">
            <div class="task-card__main">
              <span class="task-card__name">{{ taskName(task) }}</span>
              <span class="task-card__workflow">{{ task.workflowName }}</span>
            </div>
            <div class="task-card__meta">
              <span class="task-meta-chip" *ngIf="departmentLabel(task)">
                <mat-icon>corporate_fare</mat-icon>
                {{ departmentLabel(task) }}
              </span>
              <span class="task-meta-chip">
                <mat-icon>schedule</mat-icon>
                {{ task.createdAt | date:'dd/MM/yyyy HH:mm' }}
              </span>
              <span class="task-meta-chip task-meta-chip--due" *ngIf="task.dueDate">
                <mat-icon>event</mat-icon>
                Vence {{ task.dueDate | date:'dd/MM/yyyy' }}
              </span>
            </div>
          </div>
          <div class="task-card__actions">
            <button
              mat-flat-button
              color="primary"
              [disabled]="claiming() === taskId(task)"
              (click)="claim(task)"
            >
              <mat-icon>pan_tool</mat-icon>
              {{ claiming() === taskId(task) ? 'Asignando...' : 'Tomar tarea' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Lista mis tareas -->
      <div class="tasks-list" *ngIf="!loading() && !error() && activeTab() === 'mine'">

        <div class="tasks-empty" *ngIf="mine().length === 0">
          <mat-icon>assignment_ind</mat-icon>
          <strong>No tienes tareas asignadas</strong>
          <span>Toma una tarea disponible para verla en esta bandeja.</span>
        </div>

        <div class="task-card" *ngFor="let task of mine()">
          <div class="task-card__body">
            <div class="task-card__main">
              <span class="task-card__name">{{ taskName(task) }}</span>
              <span class="task-card__workflow">{{ task.workflowName }}</span>
            </div>
            <div class="task-card__meta">
              <span class="task-meta-chip" *ngIf="departmentLabel(task)">
                <mat-icon>corporate_fare</mat-icon>
                {{ departmentLabel(task) }}
              </span>
              <span class="task-meta-chip">
                <mat-icon>schedule</mat-icon>
                {{ task.createdAt | date:'dd/MM/yyyy HH:mm' }}
              </span>
              <span class="task-meta-chip task-meta-chip--due" *ngIf="task.dueDate">
                <mat-icon>event</mat-icon>
                Vence {{ task.dueDate | date:'dd/MM/yyyy' }}
              </span>
            </div>
          </div>
          <div class="task-card__actions">
            <button mat-stroked-button (click)="openTask(task)">
              <mat-icon>open_in_new</mat-icon>
              Completar
            </button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .tasks-page {
      padding: 28px 32px;
      max-width: 900px;
    }

    .tasks-header {
      margin-bottom: 24px;
    }

    .tasks-header__title {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .tasks-header__title mat-icon {
      font-size: 26px;
      width: 26px;
      height: 26px;
      color: var(--accent-strong);
    }

    .tasks-header__title h1 {
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--text);
      margin: 0;
    }

    /* Tabs */
    .tasks-tabs {
      display: flex;
      gap: 4px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 20px;
    }

    .tasks-tab {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 16px;
      border: 0;
      border-bottom: 2px solid transparent;
      background: transparent;
      color: var(--text-muted);
      font-size: 0.86rem;
      font-weight: 500;
      cursor: pointer;
      transition: color 120ms, border-color 120ms;
      position: relative;
      bottom: -1px;
    }

    .tasks-tab mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .tasks-tab.is-active {
      color: var(--accent-strong);
      border-bottom-color: var(--accent);
      font-weight: 600;
    }

    .tasks-tab:hover:not(.is-active) { color: var(--text); }

    .tab-count {
      background: var(--accent-soft);
      color: var(--accent-strong);
      font-size: 0.68rem;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 999px;
    }

    /* Estado */
    .tasks-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 48px 0;
      color: var(--text-muted);
      font-size: 0.86rem;
      text-align: center;
    }

    .tasks-state mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: var(--text-subtle);
    }

    .tasks-state--error mat-icon { color: var(--danger); }
    .tasks-state--error { color: var(--danger); }

    /* Empty */
    .tasks-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 48px 0;
      color: var(--text-muted);
      font-size: 0.86rem;
      text-align: center;
    }

    .tasks-empty strong {
      color: var(--text);
      font-size: 0.95rem;
    }

    .tasks-empty mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: var(--text-subtle);
    }

    /* Cards */
    .tasks-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .task-card {
      display: flex;
      align-items: center;
      gap: 16px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px 20px;
      transition: box-shadow 150ms;
    }

    .task-card:hover {
      box-shadow: var(--shadow-sm);
    }

    .task-card__body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .task-card__main {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .task-card__name {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text);
    }

    .task-card__workflow {
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .task-card__meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .task-meta-chip {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 0.72rem;
      color: var(--text-muted);
      background: var(--surface-2);
      padding: 2px 8px;
      border-radius: 999px;
    }

    .task-meta-chip mat-icon {
      font-size: 12px;
      width: 12px;
      height: 12px;
    }

    .task-meta-chip--due {
      background: rgba(180, 83, 9, 0.08);
      color: var(--warning);
    }

    .task-card__actions {
      flex-shrink: 0;
    }
  `]
})
export class TasksListPageComponent implements OnInit {
  private readonly tasksApi = inject(TasksApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly activeTab = signal<Tab>('available');
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly available = signal<TaskInstance[]>([]);
  protected readonly mine = signal<TaskInstance[]>([]);
  protected readonly claiming = signal<string | null>(null);

  ngOnInit(): void {
    this.loadAll();
  }

  protected switchTab(tab: Tab): void {
    this.activeTab.set(tab);
  }

  protected reload(): void {
    this.loadAll();
  }

  protected claim(task: TaskInstance): void {
    const id = this.taskId(task);
    this.claiming.set(id);
    this.tasksApi.claimTask(id).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (claimed) => {
        this.claiming.set(null);
        this.available.update((list) => list.filter((t) => this.taskId(t) !== id));
        this.mine.update((list) => [claimed, ...list]);
        this.activeTab.set('mine');
      },
      error: () => {
        this.claiming.set(null);
      }
    });
  }

  protected openTask(task: TaskInstance): void {
    void this.router.navigate(['/operation/tasks', this.taskId(task)]);
  }

  protected taskId(task: TaskInstance): string {
    return task.id ?? task.taskId ?? '';
  }

  protected taskName(task: TaskInstance): string {
    return task.name ?? task.taskName ?? task.taskDefinitionKey ?? 'Tarea';
  }

  protected departmentLabel(task: TaskInstance): string {
    return task.responsibleDepartmentName
      ?? task.departmentName
      ?? task.responsibleDepartmentCode
      ?? task.departmentCode
      ?? '';
  }

  private loadAll(): void {
    this.loading.set(true);
    this.error.set('');

    let availableDone = false;
    let mineDone = false;

    const checkDone = (): void => {
      if (availableDone && mineDone) this.loading.set(false);
    };

    this.tasksApi.getAvailableTasks().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (list) => { this.available.set(this.deduplicateById(list)); availableDone = true; checkDone(); },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message || 'No fue posible cargar las tareas.');
        availableDone = true; checkDone();
      }
    });

    this.tasksApi.getMyTasks().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (list) => { this.mine.set(this.deduplicateById(list)); mineDone = true; checkDone(); },
      error: () => { mineDone = true; checkDone(); }
    });
  }

  private deduplicateById(tasks: TaskInstance[]): TaskInstance[] {
    const seen = new Set<string>();
    return tasks.filter((t) => {
      const id = this.taskId(t);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }
}
