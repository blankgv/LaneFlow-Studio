import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

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
    MatTableModule,
    MatTooltipModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="data-table">
      <div class="data-table__state" *ngIf="loading">
        <mat-spinner diameter="22" />
        <span>Cargando roles...</span>
      </div>

      <div class="data-table__state" *ngIf="!loading && roles.length === 0">
        <mat-icon>admin_panel_settings</mat-icon>
        <strong>Sin roles</strong>
        <span>Crea uno para distribuir permisos.</span>
      </div>

      <div class="data-table__wrap" *ngIf="!loading && roles.length > 0">
        <table mat-table [dataSource]="roles">
          <ng-container matColumnDef="code">
            <th mat-header-cell *matHeaderCellDef>Codigo</th>
            <td mat-cell *matCellDef="let item">{{ item.code }}</td>
          </ng-container>

          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Rol</th>
            <td mat-cell *matCellDef="let item">
              <div class="stack-cell">
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
            <th mat-header-cell *matHeaderCellDef class="data-table__actions">Acciones</th>
            <td mat-cell *matCellDef="let item" class="data-table__actions">
              <a
                mat-icon-button
                [routerLink]="['/admin/roles', item.id, 'edit']"
                matTooltip="Editar"
                aria-label="Editar rol"
              >
                <mat-icon>edit</mat-icon>
              </a>
              <button
                *ngIf="canManage"
                mat-icon-button
                color="warn"
                matTooltip="Desactivar"
                aria-label="Desactivar rol"
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
export class RolesTableComponent {
  @Input() roles: Role[] = [];
  @Input() loading = false;
  @Input() canManage = false;

  @Output() readonly deactivate = new EventEmitter<Role>();

  protected readonly displayedColumns = ['code', 'name', 'permissions', 'createdAt', 'actions'];
}
