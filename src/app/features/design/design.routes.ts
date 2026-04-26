import { Routes } from '@angular/router';

import { authGuard } from '../../core/guards/auth.guard';
import { permissionGuard } from '../../core/guards/permission.guard';
import { PolicyEditorPageComponent } from './pages/policy-editor-page.component';
import { PolicyListPageComponent } from './pages/policy-list-page.component';

export const DESIGN_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard, permissionGuard],
    data: { permissions: ['WORKFLOW_READ'] },
    component: PolicyListPageComponent
  },
  {
    path: ':id/editor',
    canActivate: [authGuard, permissionGuard],
    data: { permissions: ['WORKFLOW_READ'] },
    component: PolicyEditorPageComponent
  }
];
