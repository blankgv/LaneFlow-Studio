import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';

import { ApiError } from '../../../core/models/api-error.model';
import { AuthSessionService } from '../../auth/services/auth-session.service';
import { AdminPageHeaderComponent } from '../components/admin-page-header/admin-page-header.component';
import { StaffTableComponent } from '../components/staff-table/staff-table.component';
import { Staff } from '../models/staff.model';
import { AdminStaffService } from '../services/admin-staff.service';

@Component({
  selector: 'app-staff-list-page',
  standalone: true,
  imports: [CommonModule, AdminPageHeaderComponent, StaffTableComponent],
  template: `
    <section class="page-wrap">
      <app-admin-page-header
        eyebrow="CU03"
        title="Gestionar personal"
        description="Administra el personal activo de la organizacion, su identificacion interna y su asignacion departamental."
        actionLabel="Nuevo personal"
        [actionLink]="canWrite ? ['/admin/staff/new'] : null"
      />

      <div class="page-alert" *ngIf="errorMessage()">{{ errorMessage() }}</div>

      <app-staff-table
        [staff]="staff()"
        [loading]="loading()"
        [canManage]="canWrite"
        (deactivate)="onDeactivate($event)"
      />
    </section>
  `,
  styles: [`
    .page-wrap {
      padding: 28px;
    }

    .page-alert {
      margin-bottom: 18px;
      padding: 12px 14px;
      border-radius: 12px;
      background: rgba(211, 47, 47, 0.08);
      color: #b3261e;
    }

    @media (max-width: 720px) {
      .page-wrap {
        padding: 20px;
      }
    }
  `]
})
export class StaffListPageComponent {
  private readonly staffService = inject(AdminStaffService);
  private readonly authSession = inject(AuthSessionService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly staff = signal<Staff[]>([]);
  protected readonly canWrite = this.authSession.hasPermission('STAFF_WRITE');

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
