import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DepartmentOption } from '../../models/department-option.model';

@Component({
  selector: 'app-departments-table',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="data-table">
      <div class="data-table__state" *ngIf="loading">
        <mat-spinner diameter="22" />
        <span>Cargando departamentos...</span>
      </div>

      <div class="data-table__state" *ngIf="!loading && departments.length === 0">
        <mat-icon>domain_disabled</mat-icon>
        <strong>Sin departamentos</strong>
        <span>Crea el primero para organizar el modulo.</span>
      </div>

      <div class="data-table__wrap" *ngIf="!loading && departments.length > 0">
        <table mat-table [dataSource]="departments">
          <ng-container matColumnDef="code">
            <th mat-header-cell *matHeaderCellDef>Codigo</th>
            <td mat-cell *matCellDef="let item">{{ item.code }}</td>
          </ng-container>

          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Departamento</th>
            <td mat-cell *matCellDef="let item">
              <div class="stack-cell">
                <strong>{{ item.name }}</strong>
                <span>{{ item.description || 'Sin descripcion' }}</span>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="parent">
            <th mat-header-cell *matHeaderCellDef>Dependencia</th>
            <td mat-cell *matCellDef="let item">{{ parentName(item.parentId) }}</td>
          </ng-container>

          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef>Alta</th>
            <td mat-cell *matCellDef="let item">{{ item.createdAt | date: 'dd/MM/yyyy' }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="data-table__actions">Acciones</th>
            <td mat-cell *matCellDef="let item" class="data-table__actions">
              <a
                mat-icon-button
                [routerLink]="['/admin/departments', item.id, 'edit']"
                matTooltip="Editar"
                aria-label="Editar departamento"
              >
                <mat-icon>edit</mat-icon>
              </a>
              <button
                *ngIf="canManage"
                mat-icon-button
                color="warn"
                matTooltip="Desactivar"
                aria-label="Desactivar departamento"
                (click)="deactivate.emit(item)"
              >
                <mat-icon>block</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>
      </div>
    </section>
  `
})
export class DepartmentsTableComponent {
  @Input() departments: DepartmentOption[] = [];
  @Input() loading = false;
  @Input() canManage = false;

  @Output() readonly deactivate = new EventEmitter<DepartmentOption>();

  protected readonly displayedColumns = ['code', 'name', 'parent', 'createdAt', 'actions'];

  protected parentName(parentId: string | null): string {
    if (!parentId) {
      return 'Sin dependencia';
    }

    const parent = this.departments.find((item) => item.id === parentId);

    if (!parent) {
      return 'No disponible';
    }

    return `${parent.code} - ${parent.name}`;
  }
}
