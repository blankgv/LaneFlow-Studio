import { Routes } from '@angular/router';

import { permissionGuard } from '../../core/guards/permission.guard';
import { DepartmentFormPageComponent } from './pages/department-form-page.component';
import { DepartmentsListPageComponent } from './pages/departments-list-page.component';
import { RoleFormPageComponent } from './pages/role-form-page.component';
import { RolesListPageComponent } from './pages/roles-list-page.component';
import { StaffFormPageComponent } from './pages/staff-form-page.component';
import { StaffListPageComponent } from './pages/staff-list-page.component';
import { UserFormPageComponent } from './pages/user-form-page.component';
import { UsersListPageComponent } from './pages/users-list-page.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'departments'
  },
  {
    path: 'departments',
    canActivate: [permissionGuard],
    data: { permissions: ['DEPT_READ'] },
    component: DepartmentsListPageComponent
  },
  {
    path: 'departments/new',
    canActivate: [permissionGuard],
    data: { permissions: ['DEPT_WRITE'] },
    component: DepartmentFormPageComponent
  },
  {
    path: 'departments/:id/edit',
    canActivate: [permissionGuard],
    data: { permissions: ['DEPT_WRITE'] },
    component: DepartmentFormPageComponent
  },
  {
    path: 'staff',
    canActivate: [permissionGuard],
    data: { permissions: ['STAFF_READ'] },
    component: StaffListPageComponent
  },
  {
    path: 'staff/new',
    canActivate: [permissionGuard],
    data: { permissions: ['STAFF_WRITE'] },
    component: StaffFormPageComponent
  },
  {
    path: 'staff/:id/edit',
    canActivate: [permissionGuard],
    data: { permissions: ['STAFF_WRITE'] },
    component: StaffFormPageComponent
  },
  {
    path: 'roles',
    canActivate: [permissionGuard],
    data: { permissions: ['ROLE_READ'] },
    component: RolesListPageComponent
  },
  {
    path: 'roles/new',
    canActivate: [permissionGuard],
    data: { permissions: ['ROLE_WRITE'] },
    component: RoleFormPageComponent
  },
  {
    path: 'roles/:id/edit',
    canActivate: [permissionGuard],
    data: { permissions: ['ROLE_WRITE'] },
    component: RoleFormPageComponent
  },
  {
    path: 'users',
    canActivate: [permissionGuard],
    data: { permissions: ['USER_READ'] },
    component: UsersListPageComponent
  },
  {
    path: 'users/new',
    canActivate: [permissionGuard],
    data: { permissions: ['USER_WRITE'] },
    component: UserFormPageComponent
  },
  {
    path: 'users/:id/edit',
    canActivate: [permissionGuard],
    data: { permissions: ['USER_WRITE'] },
    component: UserFormPageComponent
  }
];
