import { Routes } from '@angular/router';

import { ShellComponent } from './layout/shell/shell.component';

export const appRoutes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'auth/login'
      },
      {
        path: 'auth',
        loadChildren: () =>
          import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES)
      },
      {
        path: 'admin',
        loadChildren: () =>
          import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES)
      },
      {
        path: 'design',
        loadChildren: () =>
          import('./features/design/design.routes').then((m) => m.DESIGN_ROUTES)
      },
      {
        path: 'operation',
        loadChildren: () =>
          import('./features/operation/operation.routes').then((m) => m.OPERATION_ROUTES)
      },
      {
        path: 'tracking',
        loadChildren: () =>
          import('./features/tracking/tracking.routes').then((m) => m.TRACKING_ROUTES)
      },
      {
        path: 'analytics',
        loadChildren: () =>
          import('./features/analytics/analytics.routes').then((m) => m.ANALYTICS_ROUTES)
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
