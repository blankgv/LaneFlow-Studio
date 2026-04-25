import { CommonModule, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { Role } from '../../models/role.model';

@Component({
  selector: 'app-roles-table',
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
          <strong>{{ roles.length }} roles activos</strong>
          <span>Define perfiles de acceso y capacidades operativas por permiso.</span>
        </div>
      </header>

      <div class="table-card__loading" *ngIf="loading">
        <mat-spinner diameter="28" />
        <span>Cargando roles...</span>
      </div>

      <div class="empty-state" *ngIf="!loading && roles.length === 0">
        <mat-icon>admin_panel_settings</mat-icon>
        <strong>No hay roles registrados todavia</strong>
        <span>Crea un rol para empezar a distribuir permisos dentro del sistema.</span>
      </div>

      <div class="table-wrap" *ngIf="!loading && roles.length > 0">
        <table mat-table [dataSource]="roles">
          <ng-container matColumnDef="code">
            <th mat-header-cell *matHeaderCellDef>Codigo</th>
            <td mat-cell *matCellDef="let item">{{ item.code }}</td>
          </ng-container>

          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Rol</th>
            <td mat-cell *matCellDef="let item">
              <div class="name-cell">
                <strong>{{ item.name }}</strong>
                <span>{{ item.description || 'Sin descripcion' }}</span>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="permissions">
            <th mat-header-cell *matHeaderCellDef>Permisos</th>
            <td mat-cell *matCellDef="let item">{{ item.permissions.length }} asignados</td>
          </ng-container>

          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef>Alta</th>
            <td mat-cell *matCellDef="let item">{{ item.createdAt | date: 'dd/MM/yyyy' }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="actions-col">Acciones</th>
            <td mat-cell *matCellDef="let item" class="actions-col">
              <a mat-stroked-button [routerLink]="['/admin/roles', item.id, 'edit']">
                <mat-icon>edit</mat-icon>
                Editar
              </a>
              <button *ngIf="canManage" mat-button color="warn" (click)="deactivate.emit(item)">
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
export class RolesTableComponent {
  @Input() roles: Role[] = [];
  @Input() loading = false;
  @Input() canManage = false;

  @Output() readonly deactivate = new EventEmitter<Role>();

  protected readonly displayedColumns = ['code', 'name', 'permissions', 'createdAt', 'actions'];
}
