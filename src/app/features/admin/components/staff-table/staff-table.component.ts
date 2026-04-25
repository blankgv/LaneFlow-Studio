import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

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
    MatTableModule,
    MatTooltipModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="data-table">
      <div class="data-table__state" *ngIf="loading">
        <mat-spinner diameter="22" />
        <span>Cargando personal...</span>
      </div>

      <div class="data-table__state" *ngIf="!loading && staff.length === 0">
        <mat-icon>group_off</mat-icon>
        <strong>Sin personal</strong>
        <span>Crea el primer registro para empezar.</span>
      </div>

      <div class="data-table__wrap" *ngIf="!loading && staff.length > 0">
        <table mat-table [dataSource]="staff">
          <ng-container matColumnDef="code">
            <th mat-header-cell *matHeaderCellDef>Codigo</th>
            <td mat-cell *matCellDef="let item">{{ item.code }}</td>
          </ng-container>

          <ng-container matColumnDef="fullName">
            <th mat-header-cell *matHeaderCellDef>Personal</th>
            <td mat-cell *matCellDef="let item">
              <div class="stack-cell">
                <strong>{{ item.firstName }} {{ item.lastName }}</strong>
                <span>{{ item.email }}</span>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="department">
            <th mat-header-cell *matHeaderCellDef>Departamento</th>
            <td mat-cell *matCellDef="let item">
              <div class="stack-cell">
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
            <th mat-header-cell *matHeaderCellDef class="data-table__actions">Acciones</th>
            <td mat-cell *matCellDef="let item" class="data-table__actions">
              <a
                mat-icon-button
                [routerLink]="['/admin/staff', item.id, 'edit']"
                matTooltip="Editar"
                aria-label="Editar personal"
              >
                <mat-icon>edit</mat-icon>
              </a>
              <button
                *ngIf="canManage"
                mat-icon-button
                color="warn"
                matTooltip="Desactivar"
                aria-label="Desactivar personal"
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
export class StaffTableComponent {
  @Input() staff: Staff[] = [];
  @Input() loading = false;
  @Input() canManage = false;

  @Output() readonly deactivate = new EventEmitter<Staff>();

  protected readonly displayedColumns = [
    'code',
    'fullName',
    'department',
    'phone',
    'createdAt',
    'actions'
  ];
}
