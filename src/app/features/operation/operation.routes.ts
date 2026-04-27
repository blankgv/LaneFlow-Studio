import { Routes } from '@angular/router';

import { TasksListPageComponent } from './pages/tasks-list-page.component';
import { TaskDetailPageComponent } from './pages/task-detail-page.component';
import { ProcedureStartPageComponent } from './pages/procedure-start-page.component';
import { ApplicantsPageComponent } from './pages/applicants-page.component';
import { ProceduresListPageComponent } from './pages/procedures-list-page.component';
import { ProcedureDetailPageComponent } from './pages/procedure-detail-page.component';

export const OPERATION_ROUTES: Routes = [
  {
    path: 'procedures',
    component: ProceduresListPageComponent
  },
  {
    path: 'procedures/:id',
    component: ProcedureDetailPageComponent
  },
  {
    path: 'start',
    component: ProcedureStartPageComponent
  },
  {
    path: 'applicants',
    component: ApplicantsPageComponent
  },
  {
    path: 'tasks',
    component: TasksListPageComponent
  },
  {
    path: 'tasks/:id',
    component: TaskDetailPageComponent
  },
  {
    path: '',
    redirectTo: 'procedures',
    pathMatch: 'full'
  }
];
