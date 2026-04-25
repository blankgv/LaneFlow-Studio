import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ApiError } from '../../../core/models/api-error.model';
import { AuthSessionService } from '../../auth/services/auth-session.service';
import { AdminPageHeaderComponent } from '../components/admin-page-header/admin-page-header.component';
import { AdminSearchBarComponent } from '../components/admin-search-bar/admin-search-bar.component';
import { StaffTableComponent } from '../components/staff-table/staff-table.component';
import { Staff } from '../models/staff.model';
import { AdminStaffService } from '../services/admin-staff.service';

@Component({
  selector: 'app-staff-list-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    AdminPageHeaderComponent,
    AdminSearchBarComponent,
    StaffTableComponent
  ],
  template: `
    <section class="admin-page">
      <app-admin-page-header
        title="Personal"
        description="Administra el personal activo y su asignacion departamental."
      />

      <div class="admin-page__alert" *ngIf="errorMessage()">{{ errorMessage() }}</div>

      <div class="admin-page__toolbar">
        <app-admin-search-bar
          label="Buscar personal"
          placeholder="Codigo, nombre, correo o departamento"
          [value]="searchTerm()"
          (valueChange)="searchTerm.set($event)"
        />

        <a *ngIf="canWrite" mat-flat-button color="primary" [routerLink]="['/admin/staff/new']">
          <mat-icon>person_add</mat-icon>
          Nuevo personal
        </a>
      </div>

      <app-staff-table
        [staff]="filteredStaff()"
        [loading]="loading()"
        [canManage]="canWrite"
        (deactivate)="onDeactivate($event)"
      />
    </section>
  `
})
export class StaffListPageComponent {
  private readonly staffService = inject(AdminStaffService);
  private readonly authSession = inject(AuthSessionService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly staff = signal<Staff[]>([]);
  protected readonly searchTerm = signal('');
  protected readonly canWrite = this.authSession.hasPermission('STAFF_WRITE');
  protected readonly filteredStaff = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();

    if (!term) {
      return this.staff();
    }

    return this.staff().filter((item) =>
      [
        item.code,
        item.firstName,
        item.lastName,
        item.email,
        item.departmentCode,
        item.departmentName,
        item.phone ?? ''
      ].some((value) => value.toLowerCase().includes(term))
    );
  });

  constructor() {
    this.loadStaff();
  }

  protected onDeactivate(item: Staff): void {
    if (!this.canWrite) {
      return;
    }

    const confirmed = confirm(`Se desactivara el registro de ${item.firstName} ${item.lastName}.`);

    if (!confirmed) {
      return;
    }

    this.staffService.deleteStaff(item.id)
      .subscribe({
        next: () => {
          this.staff.update((list) => list.filter((entry) => entry.id !== item.id));
        },
        error: (error: HttpErrorResponse) => {
          const apiError = error.error as Partial<ApiError> | null;
          this.errorMessage.set(apiError?.message || 'No fue posible desactivar el registro.');
        }
      });
  }

  private loadStaff(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.staffService.getStaff()
      .subscribe({
        next: (response) => {
          this.staff.set(response);
        },
        error: (error: HttpErrorResponse) => {
          const apiError = error.error as Partial<ApiError> | null;
          this.errorMessage.set(apiError?.message || 'No fue posible cargar el personal.');
          this.loading.set(false);
        },
        complete: () => {
          this.loading.set(false);
        }
      });
  }
}
