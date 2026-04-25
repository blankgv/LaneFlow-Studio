import { CommonModule, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

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
    MatTableModule
  ],
  template: `
    <section class="table-card">
      <header class="table-card__header">
        <div>
          <strong>{{ departments.length }} departamentos activos</strong>
          <span>Estructura la organizacion con areas principales y dependencias internas.</span>
        </div>
      </header>

      <div class="table-card__loading" *ngIf="loading">
        <mat-spinner diameter="28" />
        <span>Cargando departamentos...</span>
      </div>

      <div class="empty-state" *ngIf="!loading && departments.length === 0">
        <mat-icon>domain_disabled</mat-icon>
        <strong>No hay departamentos registrados todavia</strong>
        <span>Crea el primer departamento para organizar el resto del modulo administrativo.</span>
      </div>

      <div class="table-wrap" *ngIf="!loading && departments.length > 0">
        <table mat-table [dataSource]="departments">
          <ng-container matColumnDef="code">
            <th mat-header-cell *matHeaderCellDef>Codigo</th>
            <td mat-cell *matCellDef="let item">{{ item.code }}</td>
          </ng-container>

          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Departamento</th>
            <td mat-cell *matCellDef="let item">
              <div class="name-cell">
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
            <th mat-header-cell *matHeaderCellDef class="actions-col">Acciones</th>
            <td mat-cell *matCellDef="let item" class="actions-col">
              <a mat-stroked-button [routerLink]="['/admin/departments', item.id, 'edit']">
                <mat-icon>edit</mat-icon>
                Editar
              </a>
              <button
                *ngIf="canManage"
                mat-button
                color="warn"
                (click)="deactivate.emit(item)"
              >
                <mat-icon>block</mat-icon>
                Desactivar
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>
      </div>
    </section>
  `,
  styles: [`
    .table-card {
      border-radius: 22px;
      background: #fffdf8;
      border: 1px solid rgba(29, 36, 51, 0.08);
      box-shadow: 0 16px 34px rgba(29, 36, 51, 0.05);
      overflow: hidden;
    }

    .table-card__header {
      padding: 18px 20px;
      border-bottom: 1px solid rgba(29, 36, 51, 0.06);
      background: rgba(10, 122, 108, 0.03);
    }

    .table-card__header strong,
    .table-card__header span {
      display: block;
    }

    .table-card__header strong {
      margin-bottom: 6px;
      color: #1d2433;
    }

    .table-card__header span {
      color: #637087;
      font-size: 0.88rem;
    }

    .table-card__loading,
    .empty-state {
      padding: 42px 24px;
      display: grid;
      place-items: center;
      gap: 12px;
      text-align: center;
      color: #637087;
    }

    .empty-state mat-icon {
      width: 28px;
      height: 28px;
      font-size: 28px;
      color: #0a7a6c;
    }

    .table-wrap {
      overflow-x: auto;
    }

    table {
      width: 100%;
      background: transparent;
    }

    .name-cell strong,
    .name-cell span {
      display: block;
    }

    .name-cell strong {
      margin-bottom: 4px;
      color: #1d2433;
    }

    .name-cell span {
      color: #637087;
      font-size: 0.84rem;
    }

    .actions-col {
      white-space: nowrap;
    }

    .actions-col a,
    .actions-col button {
      margin-right: 8px;
    }
  `]
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
