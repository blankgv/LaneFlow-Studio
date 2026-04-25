import { CommonModule, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { Staff } from '../../models/staff.model';

@Component({
  selector: 'app-staff-table',
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
          <strong>{{ staff.length }} registros activos</strong>
          <span>Gestiona personal asociado a departamentos activos.</span>
        </div>
      </header>

      <div class="table-card__loading" *ngIf="loading">
        <mat-spinner diameter="28" />
        <span>Cargando personal...</span>
      </div>

      <div class="empty-state" *ngIf="!loading && staff.length === 0">
        <mat-icon>group_off</mat-icon>
        <strong>No hay personal registrado todavia</strong>
        <span>Crea el primer registro para iniciar la administracion del equipo.</span>
      </div>

      <div class="table-wrap" *ngIf="!loading && staff.length > 0">
        <table mat-table [dataSource]="staff">
          <ng-container matColumnDef="code">
            <th mat-header-cell *matHeaderCellDef>Codigo</th>
            <td mat-cell *matCellDef="let item">{{ item.code }}</td>
          </ng-container>

          <ng-container matColumnDef="fullName">
            <th mat-header-cell *matHeaderCellDef>Personal</th>
            <td mat-cell *matCellDef="let item">
              <div class="person-cell">
                <strong>{{ item.firstName }} {{ item.lastName }}</strong>
                <span>{{ item.email }}</span>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="department">
            <th mat-header-cell *matHeaderCellDef>Departamento</th>
            <td mat-cell *matCellDef="let item">
              <div class="department-cell">
                <strong>{{ item.departmentName }}</strong>
                <span>{{ item.departmentCode }}</span>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="phone">
            <th mat-header-cell *matHeaderCellDef>Telefono</th>
            <td mat-cell *matCellDef="let item">{{ item.phone || 'Sin registro' }}</td>
          </ng-container>

          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef>Alta</th>
            <td mat-cell *matCellDef="let item">{{ item.createdAt | date: 'dd/MM/yyyy' }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="actions-col">Acciones</th>
            <td mat-cell *matCellDef="let item" class="actions-col">
              <a mat-stroked-button [routerLink]="['/admin/staff', item.id, 'edit']">
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

    .mat-mdc-header-row,
    .mat-mdc-row {
      background: transparent;
    }

    .person-cell strong,
    .person-cell span,
    .department-cell strong,
    .department-cell span {
      display: block;
    }

    .person-cell strong,
    .department-cell strong {
      margin-bottom: 4px;
      color: #1d2433;
    }

    .person-cell span,
    .department-cell span {
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
export class StaffTableComponent {
  @Input() staff: Staff[] = [];
  @Input() loading = false;
  @Input() canManage = false;

  @Output() readonly deactivate = new EventEmitter<Staff>();

  protected readonly displayedColumns = ['code', 'fullName', 'department', 'phone', 'createdAt', 'actions'];
}
