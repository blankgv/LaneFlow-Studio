import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';

import { ApiError } from '../../../core/models/api-error.model';
import { AuthSessionService } from '../../auth/services/auth-session.service';
import { AdminPageHeaderComponent } from '../components/admin-page-header/admin-page-header.component';
import { DepartmentsTableComponent } from '../components/departments-table/departments-table.component';
import { DepartmentOption } from '../models/department-option.model';
import { AdminDepartmentsService } from '../services/admin-departments.service';

@Component({
  selector: 'app-departments-list-page',
  standalone: true,
  imports: [CommonModule, AdminPageHeaderComponent, DepartmentsTableComponent],
  template: `
    <section class="page-wrap">
      <app-admin-page-header
        eyebrow="Departamentos"
        title="Gestionar departamentos"
        description="Organiza la estructura base de la institucion con areas principales y relaciones jerarquicas simples."
        actionLabel="Nuevo departamento"
        [actionLink]="canWrite ? ['/admin/departments/new'] : null"
        actionIcon="apartment"
      />

      <div class="page-alert" *ngIf="errorMessage()">{{ errorMessage() }}</div>

      <app-departments-table
        [departments]="departments()"
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
export class DepartmentsListPageComponent {
  private readonly departmentsService = inject(AdminDepartmentsService);
  private readonly authSession = inject(AuthSessionService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly departments = signal<DepartmentOption[]>([]);
  protected readonly canWrite = this.authSession.hasPermission('DEPT_WRITE');

  constructor() {
    this.loadDepartments();
  }

  protected onDeactivate(item: DepartmentOption): void {
    if (!this.canWrite) {
      return;
    }

    const confirmed = confirm(`Se desactivara el departamento ${item.name}.`);

    if (!confirmed) {
      return;
    }

    this.departmentsService.deleteDepartment(item.id).subscribe({
      next: () => {
        this.departments.update((list) => list.filter((entry) => entry.id !== item.id));
      },
      error: (error: HttpErrorResponse) => {
        const apiError = error.error as Partial<ApiError> | null;
        this.errorMessage.set(apiError?.message || 'No fue posible desactivar el departamento.');
      }
    });
  }

  private loadDepartments(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.departmentsService.getDepartments().subscribe({
      next: (response) => {
        this.departments.set(response);
      },
      error: (error: HttpErrorResponse) => {
        const apiError = error.error as Partial<ApiError> | null;
        this.errorMessage.set(apiError?.message || 'No fue posible cargar los departamentos.');
        this.loading.set(false);
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }
}
