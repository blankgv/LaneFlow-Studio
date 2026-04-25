import { Routes } from '@angular/router';

import { authGuard } from '../../core/guards/auth.guard';
import { guestGuard } from '../../core/guards/guest.guard';
import { LoginPageComponent } from './pages/login-page.component';
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
    path: 'session',
    canActivate: [authGuard],
    component: SessionPageComponent
  }
];
