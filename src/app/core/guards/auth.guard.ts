import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

import { AuthSessionService } from '../../features/auth/services/auth-session.service';

export const authGuard: CanActivateFn = () => {
  const authSession = inject(AuthSessionService);
  const router = inject(Router);

  if (authSession.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/auth/login']);
};
