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
import { RolesTableComponent } from '../components/roles-table/roles-table.component';
import { Role } from '../models/role.model';
import { AdminRolesService } from '../services/admin-roles.service';

@Component({
  selector: 'app-roles-list-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    AdminPageHeaderComponent,
    AdminSearchBarComponent,
    RolesTableComponent
  ],
  template: `
    <section class="admin-page">
      <app-admin-page-header
        title="Roles y permisos"
        description="Define perfiles de acceso y capacidades operativas por rol."
      />

      <div class="admin-page__alert" *ngIf="errorMessage()">{{ errorMessage() }}</div>

      <div class="admin-page__toolbar">
        <app-admin-search-bar
          label="Buscar rol"
          placeholder="Codigo, nombre, descripcion o permiso"
          [value]="searchTerm()"
          (valueChange)="searchTerm.set($event)"
        />

        <a *ngIf="canWrite" mat-flat-button color="primary" [routerLink]="['/admin/roles/new']">
          <mat-icon>admin_panel_settings</mat-icon>
          Nuevo rol
        </a>
      </div>

      <app-roles-table
        [roles]="filteredRoles()"
        [loading]="loading()"
        [canManage]="canWrite"
        (deactivate)="onDeactivate($event)"
      />
    </section>
  `
})
export class RolesListPageComponent {
  private readonly rolesService = inject(AdminRolesService);
  private readonly authSession = inject(AuthSessionService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly roles = signal<Role[]>([]);
  protected readonly searchTerm = signal('');
  protected readonly canWrite = this.authSession.hasPermission('ROLE_WRITE');
  protected readonly filteredRoles = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();

    if (!term) {
      return this.roles();
    }

    return this.roles().filter((item) =>
      [item.code, item.name, item.description ?? '', ...item.permissions].some((value) =>
        value.toLowerCase().includes(term)
      )
    );
  });

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
