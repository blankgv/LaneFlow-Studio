import { Routes } from '@angular/router';

import { permissionGuard } from '../../core/guards/permission.guard';
import { PolicyListPageComponent } from './pages/policy-list-page.component';

export const DESIGN_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard],
    data: { permissions: ['WORKFLOW_READ'] },
    component: PolicyListPageComponent
  }
];
