import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { User } from '../../models/user.model';

@Component({
  selector: 'app-users-table',
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
        <span>Cargando usuarios...</span>
      </div>

      <div class="data-table__state" *ngIf="!loading && users.length === 0">
        <mat-icon>person_off</mat-icon>
        <strong>Sin usuarios</strong>
        <span>Crea el primero para comenzar a operar.</span>
      </div>

      <div class="data-table__wrap" *ngIf="!loading && users.length > 0">
        <table mat-table [dataSource]="users">
          <ng-container matColumnDef="username">
            <th mat-header-cell *matHeaderCellDef>Usuario</th>
            <td mat-cell *matCellDef="let item">
              <div class="stack-cell">
                <strong>{{ item.username }}</strong>
                <span>{{ item.email }}</span>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="staff">
            <th mat-header-cell *matHeaderCellDef>Personal asociado</th>
            <td mat-cell *matCellDef="let item">
              {{ item.staffFullName || 'Sin asociar' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="role">
            <th mat-header-cell *matHeaderCellDef>Rol</th>
            <td mat-cell *matCellDef="let item">
              <div class="stack-cell">
                <strong>{{ item.roleName }}</strong>
                <span>{{ item.roleCode }}</span>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="lastLoginAt">
            <th mat-header-cell *matHeaderCellDef>Ultimo acceso</th>
            <td mat-cell *matCellDef="let item">
              {{ item.lastLoginAt ? (item.lastLoginAt | date: 'dd/MM/yyyy HH:mm') : 'Sin registro' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="data-table__actions">Acciones</th>
            <td mat-cell *matCellDef="let item" class="data-table__actions">
              <a
                mat-icon-button
                [routerLink]="['/admin/users', item.id, 'edit']"
                matTooltip="Editar"
                aria-label="Editar usuario"
              >
                <mat-icon>edit</mat-icon>
              </a>
              <button
                *ngIf="canManage"
                mat-icon-button
                color="warn"
                matTooltip="Desactivar"
                aria-label="Desactivar usuario"
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
export class UsersTableComponent {
  @Input() users: User[] = [];
  @Input() loading = false;
  @Input() canManage = false;

  @Output() readonly deactivate = new EventEmitter<User>();

  protected readonly displayedColumns = ['username', 'staff', 'role', 'lastLoginAt', 'actions'];
}
