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
import { DepartmentsTableComponent } from '../components/departments-table/departments-table.component';
import { DepartmentOption } from '../models/department-option.model';
import { AdminDepartmentsService } from '../services/admin-departments.service';

@Component({
  selector: 'app-departments-list-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    AdminPageHeaderComponent,
    AdminSearchBarComponent,
    DepartmentsTableComponent
  ],
  template: `
    <section class="admin-page">
      <app-admin-page-header
        title="Departamentos"
        description="Organiza la estructura base con areas y dependencias jerarquicas."
      />

      <div class="admin-page__alert" *ngIf="errorMessage()">{{ errorMessage() }}</div>

      <div class="admin-page__toolbar">
        <app-admin-search-bar
          label="Buscar departamento"
          placeholder="Codigo, nombre o descripcion"
          [value]="searchTerm()"
          (valueChange)="searchTerm.set($event)"
        />

        <a *ngIf="canWrite" mat-flat-button color="primary" [routerLink]="['/admin/departments/new']">
          <mat-icon>apartment</mat-icon>
          Nuevo departamento
        </a>
      </div>

      <app-departments-table
        [departments]="filteredDepartments()"
        [loading]="loading()"
        [canManage]="canWrite"
        (deactivate)="onDeactivate($event)"
      />
    </section>
  `
})
export class DepartmentsListPageComponent {
  private readonly departmentsService = inject(AdminDepartmentsService);
  private readonly authSession = inject(AuthSessionService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly departments = signal<DepartmentOption[]>([]);
  protected readonly searchTerm = signal('');
  protected readonly canWrite = this.authSession.hasPermission('DEPT_WRITE');
  protected readonly filteredDepartments = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();

    if (!term) {
      return this.departments();
    }

    return this.departments().filter((item) =>
      [item.code, item.name, item.description ?? ''].some((value) =>
        value.toLowerCase().includes(term)
      )
    );
  });

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
