import { Routes } from '@angular/router';

import { PolicyEditorPageComponent } from './pages/policy-editor-page.component';
import { PolicyListPageComponent } from './pages/policy-list-page.component';

export const DESIGN_ROUTES: Routes = [
  {
    path: '',
    component: PolicyListPageComponent
  },
  {
    path: ':id/editor',
    component: PolicyEditorPageComponent
  }
];
