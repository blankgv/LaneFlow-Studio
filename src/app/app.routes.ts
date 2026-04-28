import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { AppShellComponent } from './layout/app-shell/app-shell.component';
import { RecoverAccessPageComponent } from './features/auth/pages/recover-access-page.component';
import { ResetPasswordPageComponent } from './features/auth/pages/reset-password-page.component';
import { DashboardPageComponent } from './features/dashboard/pages/dashboard-page.component';
import { PolicyEditorPageComponent } from './features/design/pages/policy-editor-page.component';

export const appRoutes: Routes = [
  // Authenticated app shell — all pages with sidebar
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: DashboardPageComponent
      },
      {
        path: 'admin',
        canActivate: [permissionGuard],
        data: { permissions: ['DEPT_READ'] },
        loadChildren: () =>
          import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES)
      },
      {
        path: 'design',
        canActivate: [permissionGuard],
        data: { permissions: ['WORKFLOW_READ'] },
        loadChildren: () =>
          import('./features/design/design.routes').then((m) => m.DESIGN_ROUTES)
      },
      {
        path: 'operation',
        canActivate: [permissionGuard],
        data: { permissions: ['TRAMITE_READ'] },
        loadChildren: () =>
          import('./features/operation/operation.routes').then((m) => m.OPERATION_ROUTES)
      }
    ]
  },

  // Full-screen editor — authenticated but without sidebar
  {
    path: 'design/:id/editor',
    canActivate: [authGuard, permissionGuard],
    data: { permissions: ['WORKFLOW_READ'] },
    component: PolicyEditorPageComponent
  },

  // Auth routes
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES)
  },
  {
    path: 'recover-access',
    canActivate: [guestGuard],
    component: RecoverAccessPageComponent
  },
  {
    path: 'reset-password',
    canActivate: [guestGuard],
    component: ResetPasswordPageComponent
  },

  { path: '**', redirectTo: '' }
];
