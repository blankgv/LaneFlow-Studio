import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { forkJoin, of } from 'rxjs';

import { ApiError } from '../../../core/models/api-error.model';
import { AdminPageHeaderComponent } from '../components/admin-page-header/admin-page-header.component';
import { PermissionOption, RoleFormComponent } from '../components/role-form/role-form.component';
import { RolePayload } from '../models/role-payload.model';
import { Role } from '../models/role.model';
import { AdminRolesService } from '../services/admin-roles.service';

const PERMISSIONS_CATALOG: PermissionOption[] = [
  { code: 'DEPT_READ', label: 'Ver departamentos', helper: 'Consulta la estructura organizacional.' },
  { code: 'DEPT_WRITE', label: 'Gestionar departamentos', helper: 'Crea, actualiza y desactiva departamentos.' },
  { code: 'STAFF_READ', label: 'Ver personal', helper: 'Consulta registros de personal activo.' },
  { code: 'STAFF_WRITE', label: 'Gestionar personal', helper: 'Crea, actualiza y desactiva personal.' },
  { code: 'ROLE_READ', label: 'Ver roles', helper: 'Consulta perfiles de acceso y permisos.' },
  { code: 'ROLE_WRITE', label: 'Gestionar roles', helper: 'Crea, edita y desactiva roles.' },
  { code: 'USER_READ', label: 'Ver usuarios', helper: 'Consulta cuentas activas del sistema.' },
  { code: 'USER_WRITE', label: 'Gestionar usuarios', helper: 'Crea, edita y desactiva cuentas.' },
  { code: 'WORKFLOW_READ', label: 'Ver workflows', helper: 'Consulta procesos y flujos configurados.' },
  { code: 'WORKFLOW_WRITE', label: 'Gestionar workflows', helper: 'Crea y actualiza workflows.' },
  { code: 'TRAMITE_READ', label: 'Ver tramites', helper: 'Consulta expedientes y estados operativos.' },
  { code: 'TRAMITE_WRITE', label: 'Gestionar tramites', helper: 'Ejecuta acciones sobre tramites.' },
  { code: 'REPORT_READ', label: 'Ver reportes', helper: 'Accede a indicadores y reportes operativos.' }
];

@Component({
  selector: 'app-role-form-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, AdminPageHeaderComponent, RoleFormComponent],
  template: `
    <section class="page-wrap">
      <app-admin-page-header
        [title]="isEditMode() ? 'Editar rol' : 'Nuevo rol'"
        [description]="
          isEditMode()
            ? 'Actualiza el perfil y los permisos asociados al rol seleccionado.'
            : 'Crea un nuevo rol y define sus capacidades dentro del sistema.'
        "
      />

      <mat-card class="form-card">
        <mat-card-content>
          <div class="page-alert" *ngIf="loadError()">{{ loadError() }}</div>

          <app-role-form
            [initialValue]="currentRole()"
            [loading]="saving()"
            [errorMessage]="formError()"
            [validationErrors]="validationErrors()"
            [submitLabel]="isEditMode() ? 'Guardar cambios' : 'Crear rol'"
            [permissionsCatalog]="permissionsCatalog"
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
export class RoleFormPageComponent {
  private readonly rolesService = inject(AdminRolesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly currentRole = signal<Role | null>(null);
  protected readonly loadError = signal('');
  protected readonly formError = signal('');
  protected readonly validationErrors = signal<Record<string, string> | null>(null);
  protected readonly saving = signal(false);
  protected readonly isEditMode = signal(!!this.route.snapshot.paramMap.get('id'));
  protected readonly permissionsCatalog = PERMISSIONS_CATALOG;

  constructor() {
    this.loadData();
  }

  protected onSubmit(payload: RolePayload): void {
    const id = this.route.snapshot.paramMap.get('id');
    const request$ = id
      ? this.rolesService.updateRole(id, payload)
      : this.rolesService.createRole(payload);

    this.saving.set(true);
    this.formError.set('');
    this.validationErrors.set(null);

    request$.subscribe({
      next: () => {
        void this.router.navigate(['/admin/roles']);
      },
      error: (error: HttpErrorResponse) => {
        const apiError = error.error as Partial<ApiError> | null;
        this.formError.set(apiError?.message || 'No fue posible guardar el rol.');
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
          role: this.rolesService.getRoleById(id)
        })
      : forkJoin({
          role: of<Role | null>(null)
        });

    request$.subscribe({
      next: (response: { role: Role | null }) => {
        this.currentRole.set(response.role);
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
