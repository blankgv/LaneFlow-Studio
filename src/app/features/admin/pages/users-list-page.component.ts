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
import { UsersTableComponent } from '../components/users-table/users-table.component';
import { User } from '../models/user.model';
import { AdminUsersService } from '../services/admin-users.service';

@Component({
  selector: 'app-users-list-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    AdminPageHeaderComponent,
    AdminSearchBarComponent,
    UsersTableComponent
  ],
  template: `
    <section class="admin-page">
      <app-admin-page-header
        title="Usuarios"
        description="Administra cuentas, roles asignados y vinculo con personal interno."
      />

      <div class="admin-page__alert" *ngIf="errorMessage()">{{ errorMessage() }}</div>

      <div class="admin-page__toolbar">
        <app-admin-search-bar
          label="Buscar usuario"
          placeholder="Usuario, correo, personal o rol"
          [value]="searchTerm()"
          (valueChange)="searchTerm.set($event)"
        />

        <a *ngIf="canWrite" mat-flat-button color="primary" [routerLink]="['/admin/users/new']">
          <mat-icon>person_add</mat-icon>
          Nuevo usuario
        </a>
      </div>

      <app-users-table
        [users]="filteredUsers()"
        [loading]="loading()"
        [canManage]="canWrite"
        (deactivate)="onDeactivate($event)"
      />
    </section>
  `
})
export class UsersListPageComponent {
  private readonly usersService = inject(AdminUsersService);
  private readonly authSession = inject(AuthSessionService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly users = signal<User[]>([]);
  protected readonly searchTerm = signal('');
  protected readonly canWrite = this.authSession.hasPermission('USER_WRITE');
  protected readonly filteredUsers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();

    if (!term) {
      return this.users();
    }

    return this.users().filter((item) =>
      [
        item.username,
        item.email,
        item.staffCode ?? '',
        item.staffFullName ?? '',
        item.roleCode,
        item.roleName
      ].some((value) => value.toLowerCase().includes(term))
    );
  });

  constructor() {
    this.loadUsers();
  }

  protected onDeactivate(item: User): void {
    if (!this.canWrite) {
      return;
    }

    const confirmed = confirm(`Se desactivara el usuario ${item.username}.`);

    if (!confirmed) {
      return;
    }

    this.usersService.deleteUser(item.id).subscribe({
      next: () => {
        this.users.update((list) => list.filter((entry) => entry.id !== item.id));
      },
      error: (error: HttpErrorResponse) => {
        const apiError = error.error as Partial<ApiError> | null;
        this.errorMessage.set(apiError?.message || 'No fue posible desactivar el usuario.');
      }
    });
  }

  private loadUsers(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.usersService.getUsers().subscribe({
      next: (response) => {
        this.users.set(response);
      },
      error: (error: HttpErrorResponse) => {
        const apiError = error.error as Partial<ApiError> | null;
        this.errorMessage.set(apiError?.message || 'No fue posible cargar los usuarios.');
        this.loading.set(false);
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }
}
