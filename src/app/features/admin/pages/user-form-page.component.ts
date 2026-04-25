import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { forkJoin } from 'rxjs';

import { ApiError } from '../../../core/models/api-error.model';
import { AdminPageHeaderComponent } from '../components/admin-page-header/admin-page-header.component';
import { UserFormComponent } from '../components/user-form/user-form.component';
import { Role } from '../models/role.model';
import { Staff } from '../models/staff.model';
import { UserPayload } from '../models/user-payload.model';
import { User } from '../models/user.model';
import { AdminRolesService } from '../services/admin-roles.service';
import { AdminStaffService } from '../services/admin-staff.service';
import { AdminUsersService } from '../services/admin-users.service';

@Component({
  selector: 'app-user-form-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, AdminPageHeaderComponent, UserFormComponent],
  template: `
    <section class="page-wrap">
      <app-admin-page-header
        eyebrow="Usuarios"
        [title]="isEditMode() ? 'Editar usuario' : 'Nuevo usuario'"
        [description]="
          isEditMode()
            ? 'Actualiza la vinculacion del usuario, su rol y el correo asociado.'
            : 'Crea una nueva cuenta interna y asignale personal y permisos.'
        "
      />

      <mat-card class="form-card">
        <mat-card-content>
          <div class="page-alert" *ngIf="loadError()">{{ loadError() }}</div>

          <app-user-form
            [staff]="staff()"
            [roles]="roles()"
            [initialValue]="currentUser()"
            [isEditMode]="isEditMode()"
            [loading]="saving()"
            [errorMessage]="formError()"
            [validationErrors]="validationErrors()"
            [submitLabel]="isEditMode() ? 'Guardar cambios' : 'Crear usuario'"
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
export class UserFormPageComponent {
  private readonly usersService = inject(AdminUsersService);
  private readonly staffService = inject(AdminStaffService);
  private readonly rolesService = inject(AdminRolesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly staff = signal<Staff[]>([]);
  protected readonly roles = signal<Role[]>([]);
  protected readonly currentUser = signal<User | null>(null);
  protected readonly loadError = signal('');
  protected readonly formError = signal('');
  protected readonly validationErrors = signal<Record<string, string> | null>(null);
  protected readonly saving = signal(false);
  protected readonly isEditMode = signal(!!this.route.snapshot.paramMap.get('id'));

  constructor() {
    this.loadData();
  }

  protected onSubmit(payload: UserPayload): void {
    const id = this.route.snapshot.paramMap.get('id');
    const request$ = id
      ? this.usersService.updateUser(id, payload)
      : this.usersService.createUser(payload);

    this.saving.set(true);
    this.formError.set('');
    this.validationErrors.set(null);

    request$.subscribe({
      next: () => {
        void this.router.navigate(['/admin/users']);
      },
      error: (error: HttpErrorResponse) => {
        const apiError = error.error as Partial<ApiError> | null;
        this.formError.set(apiError?.message || 'No fue posible guardar el usuario.');
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
    const request$ = forkJoin({
      staff: this.staffService.getStaff(),
      roles: this.rolesService.getRoles(),
      user: id ? this.usersService.getUserById(id) : this.usersService.getUsers().pipe()
    });

    if (!id) {
      forkJoin({
        staff: this.staffService.getStaff(),
        roles: this.rolesService.getRoles()
      }).subscribe({
        next: (response) => {
          this.staff.set(response.staff);
          this.roles.set(response.roles);
        },
        error: (error: HttpErrorResponse) => {
          const apiError = error.error as Partial<ApiError> | null;
          this.loadError.set(
            apiError?.message || 'No fue posible cargar la informacion requerida.'
          );
        }
      });

      return;
    }

    request$.subscribe({
      next: (response) => {
        this.staff.set(response.staff);
        this.roles.set(response.roles);
        this.currentUser.set(response.user as User);
      },
      error: (error: HttpErrorResponse) => {
        const apiError = error.error as Partial<ApiError> | null;
        this.loadError.set(apiError?.message || 'No fue posible cargar la informacion requerida.');
      }
    });
  }
}
