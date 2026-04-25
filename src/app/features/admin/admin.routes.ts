import { Routes } from '@angular/router';

import { authGuard } from '../../core/guards/auth.guard';
import { permissionGuard } from '../../core/guards/permission.guard';
import { AdminShellComponent } from './components/admin-shell/admin-shell.component';
import { StaffFormPageComponent } from './pages/staff-form-page.component';
import { StaffListPageComponent } from './pages/staff-list-page.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    component: AdminShellComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'staff'
      },
      {
        path: 'staff',
        canActivate: [permissionGuard],
        data: {
          permissions: ['STAFF_READ']
        },
        component: StaffListPageComponent
      },
      {
        path: 'staff/new',
        canActivate: [permissionGuard],
        data: {
          permissions: ['STAFF_WRITE']
        },
        component: StaffFormPageComponent
      },
      {
        path: 'staff/:id/edit',
        canActivate: [permissionGuard],
        data: {
          permissions: ['STAFF_WRITE']
        },
        component: StaffFormPageComponent
      }
    ]
  }
];
