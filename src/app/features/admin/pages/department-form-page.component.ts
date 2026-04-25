import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { forkJoin, of } from 'rxjs';

import { ApiError } from '../../../core/models/api-error.model';
import { AdminPageHeaderComponent } from '../components/admin-page-header/admin-page-header.component';
import { DepartmentFormComponent } from '../components/department-form/department-form.component';
import { DepartmentOption } from '../models/department-option.model';
import { DepartmentPayload } from '../models/department-payload.model';
import { AdminDepartmentsService } from '../services/admin-departments.service';

@Component({
  selector: 'app-department-form-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, AdminPageHeaderComponent, DepartmentFormComponent],
  template: `
    <section class="page-wrap">
      <app-admin-page-header
        [title]="isEditMode() ? 'Editar departamento' : 'Nuevo departamento'"
        [description]="
          isEditMode()
            ? 'Actualiza la configuracion jerarquica y descriptiva del departamento seleccionado.'
            : 'Crea un nuevo departamento para estructurar la organizacion base del sistema.'
        "
      />

      <mat-card class="form-card">
        <mat-card-content>
          <div class="page-alert" *ngIf="loadError()">{{ loadError() }}</div>

          <app-department-form
            [departments]="departments()"
            [currentDepartmentId]="currentDepartment()?.id ?? null"
            [initialValue]="currentDepartment()"
            [loading]="saving()"
            [errorMessage]="formError()"
            [validationErrors]="validationErrors()"
            [submitLabel]="isEditMode() ? 'Guardar cambios' : 'Crear departamento'"
            (formSubmitted)="onSubmit($event)"
          />
        </mat-card-content>
      </mat-card>
    </section>
  `,
  styles: [`
    .page-wrap {
      padding: 28px;
    }

    .form-card {
      border-radius: 22px;
      border: 1px solid rgba(29, 36, 51, 0.08);
      box-shadow: 0 16px 34px rgba(29, 36, 51, 0.05);
      background: #fffdf8;
    }

    .form-card mat-card-content {
      padding: 22px;
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

      .form-card mat-card-content {
        padding: 18px;
      }
    }
  `]
})
export class DepartmentFormPageComponent {
  private readonly departmentsService = inject(AdminDepartmentsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly departments = signal<DepartmentOption[]>([]);
  protected readonly currentDepartment = signal<DepartmentOption | null>(null);
  protected readonly loadError = signal('');
  protected readonly formError = signal('');
  protected readonly validationErrors = signal<Record<string, string> | null>(null);
  protected readonly saving = signal(false);
  protected readonly isEditMode = signal(!!this.route.snapshot.paramMap.get('id'));

  constructor() {
    this.loadData();
  }

  protected onSubmit(payload: DepartmentPayload): void {
    const id = this.route.snapshot.paramMap.get('id');
    const request$ = id
      ? this.departmentsService.updateDepartment(id, payload)
      : this.departmentsService.createDepartment(payload);

    this.saving.set(true);
    this.formError.set('');
    this.validationErrors.set(null);

    request$.subscribe({
      next: () => {
        void this.router.navigate(['/admin/departments']);
      },
      error: (error: HttpErrorResponse) => {
        const apiError = error.error as Partial<ApiError> | null;
        this.formError.set(apiError?.message || 'No fue posible guardar el departamento.');
        this.validationErrors.set(apiError?.validationErrors ?? null);
        this.saving.set(false);
      },
      complete: () => {
        this.saving.set(false);
      }
    });
  }

  private loadData(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const request$ = id
      ? forkJoin({
          departments: this.departmentsService.getDepartments(),
          department: this.departmentsService.getDepartmentById(id)
        })
      : forkJoin({
          departments: this.departmentsService.getDepartments(),
          department: of<DepartmentOption | null>(null)
        });

    request$.subscribe({
      next: (response: { departments: DepartmentOption[]; department: DepartmentOption | null }) => {
        this.departments.set(response.departments);
        this.currentDepartment.set(response.department);
      },
      error: (error: HttpErrorResponse) => {
        const apiError = error.error as Partial<ApiError> | null;
        this.loadError.set(
          apiError?.message || 'No fue posible cargar la informacion requerida.'
        );
      }
    });
  }
}
