import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';

import { ApiError } from '../../../core/models/api-error.model';
import { AuthSessionService } from '../../auth/services/auth-session.service';
import { AdminPageHeaderComponent } from '../components/admin-page-header/admin-page-header.component';
import { UsersTableComponent } from '../components/users-table/users-table.component';
import { User } from '../models/user.model';
import { AdminUsersService } from '../services/admin-users.service';

@Component({
  selector: 'app-users-list-page',
  standalone: true,
  imports: [CommonModule, AdminPageHeaderComponent, UsersTableComponent],
  template: `
    <section class="page-wrap">
      <app-admin-page-header
        eyebrow="Usuarios"
        title="Gestionar usuarios"
        description="Administra cuentas, roles asignados, relacion con personal y mantenimiento de acceso interno."
        actionLabel="Nuevo usuario"
        [actionLink]="canWrite ? ['/admin/users/new'] : null"
        actionIcon="person_add"
      />

      <div class="page-alert" *ngIf="errorMessage()">{{ errorMessage() }}</div>

      <app-users-table
        [users]="users()"
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
export class UsersListPageComponent {
  private readonly usersService = inject(AdminUsersService);
  private readonly authSession = inject(AuthSessionService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly users = signal<User[]>([]);
  protected readonly canWrite = this.authSession.hasPermission('USER_WRITE');

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
