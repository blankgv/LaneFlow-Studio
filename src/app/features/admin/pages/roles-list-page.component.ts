import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';

import { ApiError } from '../../../core/models/api-error.model';
import { AuthSessionService } from '../../auth/services/auth-session.service';
import { AdminPageHeaderComponent } from '../components/admin-page-header/admin-page-header.component';
import { RolesTableComponent } from '../components/roles-table/roles-table.component';
import { Role } from '../models/role.model';
import { AdminRolesService } from '../services/admin-roles.service';

@Component({
  selector: 'app-roles-list-page',
  standalone: true,
  imports: [CommonModule, AdminPageHeaderComponent, RolesTableComponent],
  template: `
    <section class="page-wrap">
      <app-admin-page-header
        eyebrow="Roles"
        title="Gestionar roles y permisos"
        description="Define perfiles de acceso para las distintas funciones del sistema y controla sus capacidades operativas."
        actionLabel="Nuevo rol"
        [actionLink]="canWrite ? ['/admin/roles/new'] : null"
        actionIcon="admin_panel_settings"
      />

      <div class="page-alert" *ngIf="errorMessage()">{{ errorMessage() }}</div>

      <app-roles-table
        [roles]="roles()"
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
export class RolesListPageComponent {
  private readonly rolesService = inject(AdminRolesService);
  private readonly authSession = inject(AuthSessionService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly roles = signal<Role[]>([]);
  protected readonly canWrite = this.authSession.hasPermission('ROLE_WRITE');

  constructor() {
    this.loadRoles();
  }

  protected onDeactivate(item: Role): void {
    if (!this.canWrite) {
      return;
    }

    const confirmed = confirm(`Se desactivara el rol ${item.name}.`);

    if (!confirmed) {
      return;
    }

    this.rolesService.deleteRole(item.id).subscribe({
      next: () => {
        this.roles.update((list) => list.filter((entry) => entry.id !== item.id));
      },
      error: (error: HttpErrorResponse) => {
        const apiError = error.error as Partial<ApiError> | null;
        this.errorMessage.set(apiError?.message || 'No fue posible desactivar el rol.');
      }
    });
  }

  private loadRoles(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.rolesService.getRoles().subscribe({
      next: (response) => {
        this.roles.set(response);
      },
      error: (error: HttpErrorResponse) => {
        const apiError = error.error as Partial<ApiError> | null;
        this.errorMessage.set(apiError?.message || 'No fue posible cargar los roles.');
        this.loading.set(false);
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }
}
