import { Routes } from '@angular/router';

import { authGuard } from '../../core/guards/auth.guard';
import { guestGuard } from '../../core/guards/guest.guard';
import { LoginPageComponent } from './pages/login-page.component';
import { RecoverAccessPageComponent } from './pages/recover-access-page.component';
import { ResetPasswordPageComponent } from './pages/reset-password-page.component';
import { SessionPageComponent } from './pages/session-page.component';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    component: LoginPageComponent
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
  {
    path: 'session',
    canActivate: [authGuard],
    component: SessionPageComponent
  }
];
