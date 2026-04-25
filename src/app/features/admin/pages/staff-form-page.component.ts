import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { forkJoin, of } from 'rxjs';

import { ApiError } from '../../../core/models/api-error.model';
import { AdminPageHeaderComponent } from '../components/admin-page-header/admin-page-header.component';
import { StaffFormComponent } from '../components/staff-form/staff-form.component';
import { DepartmentOption } from '../models/department-option.model';
import { Staff } from '../models/staff.model';
import { StaffPayload } from '../models/staff-payload.model';
import { AdminDepartmentsService } from '../services/admin-departments.service';
import { AdminStaffService } from '../services/admin-staff.service';

@Component({
  selector: 'app-staff-form-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, AdminPageHeaderComponent, StaffFormComponent],
  template: `
    <section class="page-wrap">
      <app-admin-page-header
        eyebrow="Personal"
        [title]="isEditMode() ? 'Editar personal' : 'Nuevo personal'"
        [description]="
          isEditMode()
            ? 'Actualiza la informacion operativa y departamental del registro seleccionado.'
            : 'Registra nuevo personal dentro de la estructura organizacional activa.'
        "
      />

      <mat-card class="form-card">
        <mat-card-content>
          <div class="page-alert" *ngIf="loadError()">{{ loadError() }}</div>

          <app-staff-form
            [departments]="departments()"
            [initialValue]="currentStaff()"
            [loading]="saving()"
            [errorMessage]="formError()"
            [validationErrors]="validationErrors()"
            [submitLabel]="isEditMode() ? 'Guardar cambios' : 'Crear personal'"
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
export class StaffFormPageComponent {
  private readonly departmentsService = inject(AdminDepartmentsService);
  private readonly staffService = inject(AdminStaffService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly departments = signal<DepartmentOption[]>([]);
  protected readonly currentStaff = signal<Staff | null>(null);
  protected readonly loadError = signal('');
  protected readonly formError = signal('');
  protected readonly validationErrors = signal<Record<string, string> | null>(null);
  protected readonly saving = signal(false);
  protected readonly isEditMode = signal(!!this.route.snapshot.paramMap.get('id'));

  constructor() {
    this.loadData();
  }

  protected onSubmit(payload: StaffPayload): void {
    const id = this.route.snapshot.paramMap.get('id');
    const request$ = id
      ? this.staffService.updateStaff(id, payload)
      : this.staffService.createStaff(payload);

    this.saving.set(true);
    this.formError.set('');
    this.validationErrors.set(null);

    request$
      .subscribe({
        next: () => {
          void this.router.navigate(['/admin/staff']);
        },
        error: (error: HttpErrorResponse) => {
          const apiError = error.error as Partial<ApiError> | null;
          this.formError.set(apiError?.message || 'No fue posible guardar el registro.');
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
          staff: this.staffService.getStaffById(id)
        })
      : forkJoin({
          departments: this.departmentsService.getDepartments(),
          staff: of<Staff | null>(null)
        });

    request$
      .subscribe({
        next: (response: { departments: DepartmentOption[]; staff: Staff | null }) => {
          this.departments.set(response.departments);
          this.currentStaff.set(response.staff);
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
