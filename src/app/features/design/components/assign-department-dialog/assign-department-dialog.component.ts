import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { DepartmentOption } from '../../../admin/models/department-option.model';

@Component({
  selector: 'app-assign-department-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <div class="dialog">
      <header>
        <h2>Asignar departamento</h2>
        <p>Selecciona el departamento que representara esta lane.</p>
      </header>

      <div class="list">
        <button
          type="button"
          class="dept"
          *ngFor="let department of data.departments"
          [class.is-selected]="selected()?.id === department.id"
          (click)="selected.set(department)"
        >
          <span>
            <strong>{{ department.name }}</strong>
            <small>{{ department.code }}</small>
          </span>
          <mat-icon *ngIf="selected()?.id === department.id">check_circle</mat-icon>
        </button>
      </div>

      <footer>
        <button mat-stroked-button type="button" (click)="close(null)">Omitir</button>
        <button mat-flat-button color="primary" type="button" [disabled]="!selected()" (click)="close(selected())">
          <mat-icon>check</mat-icon>
          Asignar
        </button>
      </footer>
    </div>
  `,
  styles: [`
    .dialog {
      width: 440px;
      max-width: 100%;
      display: flex;
      flex-direction: column;
    }

    header {
      padding: 20px 20px 12px;
      border-bottom: 1px solid var(--border);
    }

    h2 {
      margin: 0;
      font-size: 1rem;
      color: var(--text);
    }

    p {
      margin: 4px 0 0;
      color: var(--text-muted);
      font-size: 0.82rem;
    }

    .list {
      max-height: 320px;
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 14px 20px;
    }

    .dept {
      width: 100%;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface);
      color: var(--text);
      padding: 10px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      text-align: left;
      cursor: pointer;
    }

    .dept.is-selected {
      border-color: var(--accent);
      background: var(--accent-soft);
      color: var(--accent-strong);
    }

    .dept span {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .dept small {
      color: var(--text-muted);
      font-size: 0.74rem;
      font-weight: 700;
    }

    footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 20px;
      border-top: 1px solid var(--border);
    }
  `]
})
export class AssignDepartmentDialogComponent {
  protected readonly data = inject<{ departments: DepartmentOption[] }>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<AssignDepartmentDialogComponent>);
  protected readonly selected = signal<DepartmentOption | null>(null);

  protected close(value: DepartmentOption | null): void {
    this.dialogRef.close(value);
  }
}
