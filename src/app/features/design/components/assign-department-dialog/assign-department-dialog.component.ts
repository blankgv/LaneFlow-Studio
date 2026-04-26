import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, Inject, OnInit, inject, signal, computed
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { DepartmentOption } from '../../../admin/models/department-option.model';
import { AdminDepartmentsService } from '../../../admin/services/admin-departments.service';
import { LaneAddedEvent } from '../bpmn-editor/bpmn-editor.component';

@Component({
  selector: 'app-assign-department-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <div class="dialog-shell">

      <div class="dialog-header">
        <div class="dialog-header__text">
          <span class="dialog-header__title">Asignar departamento</span>
          <span class="dialog-header__sub">
            {{ data.elementType === 'pool' ? 'Pool' : 'Lane' }} · el codigo del departamento quedará como nombre en el BPMN.
          </span>
        </div>
        <button type="button" class="close-btn" (click)="skip()" aria-label="Omitir">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="dialog-body">

        <!-- Cargando -->
        <div class="state-msg" *ngIf="loading()">
          <mat-icon>hourglass_empty</mat-icon>
          <span>Cargando departamentos...</span>
        </div>

        <!-- Error -->
        <div class="state-msg state-msg--error" *ngIf="loadError()">
          <mat-icon>error_outline</mat-icon>
          <span>{{ loadError() }}</span>
        </div>

        <!-- Buscador + lista -->
        <ng-container *ngIf="!loading() && !loadError()">
          <div class="search-wrap">
            <mat-icon class="search-icon">search</mat-icon>
            <input
              class="search-input"
              type="text"
              placeholder="Buscar por nombre o código..."
              [(ngModel)]="searchTerm"
              (ngModelChange)="filterDepts()"
            />
          </div>

          <div class="dept-list" *ngIf="filtered().length > 0; else emptyTpl">
            <button
              type="button"
              class="dept-item"
              [class.is-selected]="selected()?.id === dept.id"
              *ngFor="let dept of filtered()"
              (click)="select(dept)"
            >
              <div class="dept-item__info">
                <span class="dept-item__name">{{ dept.name }}</span>
                <code class="dept-item__code">{{ dept.code }}</code>
              </div>
              <mat-icon class="dept-item__check" *ngIf="selected()?.id === dept.id">check_circle</mat-icon>
            </button>
          </div>

          <ng-template #emptyTpl>
            <div class="state-msg">
              <mat-icon>search_off</mat-icon>
              <span>Sin resultados para "{{ searchTerm }}"</span>
            </div>
          </ng-template>
        </ng-container>

      </div>

      <div class="dialog-actions">
        <button mat-stroked-button type="button" (click)="skip()">Omitir</button>
        <button
          mat-flat-button
          color="primary"
          type="button"
          [disabled]="!selected()"
          (click)="confirm()"
        >
          <mat-icon>check</mat-icon>
          Asignar
        </button>
      </div>

    </div>
  `,
  styles: [`
    .dialog-shell {
      width: 440px;
      max-width: 100%;
      display: flex;
      flex-direction: column;
      max-height: 80vh;
    }

    /* Header */
    .dialog-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 20px 20px 16px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
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
      font-size: 0.76rem;
      color: var(--text-muted);
      line-height: 1.4;
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
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px 20px;
      min-height: 0;
    }

    /* States */
    .state-msg {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px 0;
      color: var(--text-muted);
      font-size: 0.84rem;
    }

    .state-msg mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    .state-msg--error {
      color: var(--danger);
    }

    /* Search */
    .search-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface-2);
    }

    .search-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .search-input {
      flex: 1;
      border: 0;
      background: transparent;
      outline: none;
      font-size: 0.84rem;
      color: var(--text);
    }

    .search-input::placeholder {
      color: var(--text-subtle);
    }

    /* Department list */
    .dept-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .dept-item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface);
      cursor: pointer;
      text-align: left;
      transition: background 120ms, border-color 120ms;
    }

    .dept-item:hover {
      background: var(--surface-hover);
    }

    .dept-item.is-selected {
      border-color: var(--accent);
      background: var(--accent-soft);
    }

    .dept-item__info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      min-width: 0;
    }

    .dept-item__name {
      font-size: 0.86rem;
      font-weight: 600;
      color: var(--text);
    }

    .dept-item__code {
      font-size: 0.76rem;
      color: var(--text-muted);
      font-family: monospace;
    }

    .dept-item__check {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--accent-strong);
      flex-shrink: 0;
    }

    /* Actions */
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 20px;
      border-top: 1px solid var(--border);
      flex-shrink: 0;
    }
  `]
})
export class AssignDepartmentDialogComponent implements OnInit {
  private readonly deptsService = inject(AdminDepartmentsService);
  private readonly dialogRef = inject(MatDialogRef<AssignDepartmentDialogComponent>);

  constructor(@Inject(MAT_DIALOG_DATA) public readonly data: LaneAddedEvent) {}

  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly departments = signal<DepartmentOption[]>([]);
  protected readonly filtered = signal<DepartmentOption[]>([]);
  protected readonly selected = signal<DepartmentOption | null>(null);

  protected searchTerm = '';

  ngOnInit(): void {
    this.deptsService.getDepartments().subscribe({
      next: (list) => {
        const active = list.filter((d) => d.active);
        this.departments.set(active);
        this.filtered.set(active);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('No se pudieron cargar los departamentos.');
        this.loading.set(false);
      }
    });
  }

  protected filterDepts(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filtered.set(this.departments());
      return;
    }
    this.filtered.set(
      this.departments().filter(
        (d) => d.name.toLowerCase().includes(term) || d.code.toLowerCase().includes(term)
      )
    );
  }

  protected select(dept: DepartmentOption): void {
    this.selected.set(dept);
  }

  protected confirm(): void {
    const dept = this.selected();
    if (!dept) return;
    this.dialogRef.close(dept);
  }

  protected skip(): void {
    this.dialogRef.close(null);
  }
}
