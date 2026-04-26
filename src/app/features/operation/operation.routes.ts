import { Routes } from '@angular/router';

import { TasksListPageComponent } from './pages/tasks-list-page.component';
import { TaskDetailPageComponent } from './pages/task-detail-page.component';

export const OPERATION_ROUTES: Routes = [
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
    redirectTo: 'tasks',
    pathMatch: 'full'
  }
];
